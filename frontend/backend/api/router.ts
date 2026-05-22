import express, { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { ChatService } from '../services/chat.service';
import { MemoryService } from '../services/memory.service';
import { UserService } from '../services/user.service';
import { AiService } from '../services/ai.service';
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
router.post('/auth/register', SecurityMiddleware.rateLimiter(10, 60), async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!name || typeof name !== 'string' || !email || typeof email !== 'string' || !password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Bad Request: name, email and password are required' });
  }

  try {
    const user = await UserService.registerUser(name.trim(), email.trim(), password);
    const token = await AuthService.createSession(user.id);
    await EventTracker.trackUserActivity(user.id, 'register_success');
    res.status(201).json({ token, user });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/auth/session', SecurityMiddleware.rateLimiter(10, 60), async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Bad Request: email and password are required' });
  }

  try {
    const userId = await UserService.verifyCredentials(email.trim(), password);
    if (!userId) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = await UserService.getUserProfile(userId);
    const token = await AuthService.createSession(userId);
    await EventTracker.trackUserActivity(userId, 'login_success');
    res.status(201).json({ token, user });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/auth/session', SecurityMiddleware.requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  
  const token = authHeader.split(' ')[1];
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

// --- Admin Endpoints ---
router.get('/admin/stats', SecurityMiddleware.requireAuth, SecurityMiddleware.requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  await EventTracker.trackUserActivity(req.securityContext!.userId, 'view_admin_stats');
  res.json({ status: 'Admin access granted', stats: {} });
});

// --- User Profile & API Key Management ---
router.use('/user', SecurityMiddleware.requireAuth, SecurityMiddleware.sanitizeAndValidateInput);

router.get('/user/profile', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const profile = await UserService.getUserProfile(req.securityContext!.userId);
    res.json(profile);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/user/profile', async (req: AuthenticatedRequest, res: Response) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Missing name or email' });

  try {
    const updated = await UserService.updateUserProfile(req.securityContext!.userId, name, email);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/user/api-keys', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const keys = await UserService.getUserApiKeys(req.securityContext!.userId);
    res.json(keys);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/user/api-keys', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const key = await UserService.createApiKey(req.securityContext!.userId);
    res.status(201).json(key);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/user/api-keys/:id', async (req: AuthenticatedRequest, res: Response) => {
  const keyId = req.params.id;
  try {
    await UserService.revokeApiKey(req.securityContext!.userId, keyId);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/user/account', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await UserService.deleteAccount(req.securityContext!.userId);
    await EventTracker.trackUserActivity(req.securityContext!.userId, 'delete_account');
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// --- AI Streaming Endpoints ---

router.use('/ai', SecurityMiddleware.requireAuth);

router.post('/ai/stream', async (req: AuthenticatedRequest, res: Response) => {
  const { message, provider = 'gemini' } = req.body;

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Bad Request: message is required' });
  }

  if (!['gemini', 'claude', 'gpt'].includes(provider)) {
    return res.status(400).json({ error: 'Bad Request: invalid provider' });
  }

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullResponse = '';

    await AiService.processStream(
      req.securityContext!.userId,
      message.trim(),
      provider,
      (chunk: string) => {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ chunk, provider })}\n\n`);
      }
    );

    await EventTracker.trackUserActivity(req.securityContext!.userId, 'ai_interaction', { provider });
    res.write(`data: ${JSON.stringify({ done: true, fullResponse })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('[API] AI streaming error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message, provider })}\n\n`);
    res.end();
  }
});

router.post('/ai/process', async (req: AuthenticatedRequest, res: Response) => {
  const { message, provider = 'gemini' } = req.body;

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Bad Request: message is required' });
  }

  try {
    let fullResponse = '';
    await AiService.processStream(
      req.securityContext!.userId,
      message.trim(),
      provider,
      (chunk: string) => { fullResponse += chunk; }
    );

    await EventTracker.trackUserActivity(req.securityContext!.userId, 'ai_interaction', { provider });
    res.json({ text: fullResponse, provider });
  } catch (error: any) {
    res.status(400).json({ error: error.message, provider });
  }
});

router.post('/ai/memories', async (req: AuthenticatedRequest, res: Response) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const items = text.split(/\.|,|;|\n/).slice(0, 3).map((s: string) => ({ category: 'note', content: s.trim() })).filter((i: any) => i.content.length > 0);
    res.json(items);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/ai/plan', async (req: AuthenticatedRequest, res: Response) => {
  const { objective } = req.body;
  if (!objective) return res.status(400).json({ error: 'objective is required' });
  try {
    const plan = [
      { title: 'Clarify objective', description: `Analyze: ${objective}` },
      { title: 'Define steps', description: 'Immediate next actions.' },
    ];
    res.json(plan);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/ai/reason', async (req: AuthenticatedRequest, res: Response) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });
  try {
    res.json({ text: `Reasoning result for: ${query}` });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});