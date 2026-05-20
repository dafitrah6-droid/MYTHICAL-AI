import express, { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { ChatService } from '../services/chat.service';
import { MemoryService } from '../services/memory.service';
import { SecurityMiddleware, AuthenticatedRequest } from '../security/middleware';
import { AccessPolicies } from '../security/policies';
import { ObservabilityMiddleware } from './middleware/observability';
import { EventTracker } from '../observability/events';

export const router = express.Router();

// Apply global observability tracking to all API routes
router.use(ObservabilityMiddleware.trackApiMetrics);

// Apply global rate limiting to all API routes (100 requests per minute per IP)
router.use(SecurityMiddleware.rateLimiter(100, 60));

// --- Auth Endpoints ---

// Stricter rate limit for auth endpoints (10 requests per minute)
router.post('/auth/session', SecurityMiddleware.rateLimiter(10, 60), async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Bad Request: Invalid email parameter' });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Bad Request: Invalid password parameter' });
  }

  try {
    const token = await AuthService.authenticateUser(email, password);
    // Extract userId from validated session for logging
    const userId = await AuthService.validateSession(token);
    if (userId) {
      await EventTracker.trackUserActivity(userId, 'login_success');
    }
    res.status(201).json({ token });
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

router.delete('/auth/session', SecurityMiddleware.requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const token = req.headers.authorization!.split(' ')[1];
  try {
    await AuthService.revokeSession(token);
    await EventTracker.trackUserActivity(req.securityContext!.userId, 'logout');
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// --- Chat Endpoints ---

// Apply Auth and Sanitization to all protected routes
router.use('/chat', SecurityMiddleware.requireAuth, SecurityMiddleware.sanitizeAndValidateInput);

router.get('/chat/conversations', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const conversations = await ChatService.getConversations(req.securityContext!.userId);
    res.json(conversations);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/chat/conversations', async (req: AuthenticatedRequest, res: Response) => {
  const { title } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Bad Request: Invalid title parameter' });
  }

  try {
    const conversation = await ChatService.createConversation(req.securityContext!.userId, title.trim());
    await EventTracker.trackUserActivity(req.securityContext!.userId, 'create_conversation');
    res.status(201).json(conversation);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/chat/messages', async (req: AuthenticatedRequest, res: Response) => {
  const { conversationId, role, content, reasoning } = req.body;

  if (!conversationId || typeof conversationId !== 'string') {
    return res.status(400).json({ error: 'Bad Request: Invalid conversationId parameter' });
  }
  
  // Resource Ownership Check
  const canAccess = await AccessPolicies.canAccessConversation(req.securityContext!.userId, conversationId);
  if (!canAccess) {
    return res.status(403).json({ error: 'Forbidden: You do not have access to this conversation.' });
  }

  if (!['user', 'assistant', 'system'].includes(role)) {
    return res.status(400).json({ error: 'Bad Request: Invalid role parameter' });
  }
  if (!content || typeof content !== 'string' || content.trim() === '') {
    return res.status(400).json({ error: 'Bad Request: Invalid content parameter' });
  }

  try {
    const message = await ChatService.addMessage(conversationId, role, content.trim(), reasoning);
    await EventTracker.trackUserActivity(req.securityContext!.userId, 'send_message');
    res.status(201).json(message);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/chat/files', async (req: AuthenticatedRequest, res: Response) => {
  const { messageId, name, size, mimeType, storagePath } = req.body;

  if (messageId !== null && typeof messageId !== 'string') {
    return res.status(400).json({ error: 'Bad Request: Invalid messageId parameter' });
  }
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Bad Request: Invalid name parameter' });
  }
  if (typeof size !== 'number' || size <= 0) {
    return res.status(400).json({ error: 'Bad Request: Invalid size parameter' });
  }
  if (!mimeType || typeof mimeType !== 'string') {
    return res.status(400).json({ error: 'Bad Request: Invalid mimeType parameter' });
  }
  if (!storagePath || typeof storagePath !== 'string') {
    return res.status(400).json({ error: 'Bad Request: Invalid storagePath parameter' });
  }

  try {
    const file = await ChatService.saveFileMetadata(req.securityContext!.userId, messageId, name, size, mimeType, storagePath);
    await EventTracker.trackUserActivity(req.securityContext!.userId, 'upload_file', { mimeType, size });
    res.status(201).json(file);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// --- Memory Endpoints ---

router.use('/memory', SecurityMiddleware.requireAuth, SecurityMiddleware.sanitizeAndValidateInput);

router.get('/memory', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const memories = await MemoryService.getUserMemories(req.securityContext!.userId);
    res.json(memories);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/memory', async (req: AuthenticatedRequest, res: Response) => {
  const { category, content } = req.body;

  if (!category || typeof category !== 'string' || category.trim() === '') {
    return res.status(400).json({ error: 'Bad Request: Invalid category parameter' });
  }
  if (!content || typeof content !== 'string' || content.trim() === '') {
    return res.status(400).json({ error: 'Bad Request: Invalid content parameter' });
  }

  try {
    const memory = await MemoryService.addMemory(req.securityContext!.userId, category.trim(), content.trim());
    await EventTracker.trackUserActivity(req.securityContext!.userId, 'create_memory');
    res.status(201).json(memory);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/memory/:id', async (req: AuthenticatedRequest, res: Response) => {
  const memoryId = req.params.id;
  
  if (!memoryId || typeof memoryId !== 'string') {
    return res.status(400).json({ error: 'Bad Request: Invalid memory ID' });
  }

  try {
    await MemoryService.deleteMemory(req.securityContext!.userId, memoryId);
    await EventTracker.trackUserActivity(req.securityContext!.userId, 'delete_memory');
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// --- Admin Endpoints Example ---
router.get('/admin/stats', SecurityMiddleware.requireAuth, SecurityMiddleware.requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  await EventTracker.trackUserActivity(req.securityContext!.userId, 'view_admin_stats');
  res.json({ status: 'Admin access granted', stats: {} });
});
