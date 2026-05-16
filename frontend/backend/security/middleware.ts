import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { redisClient, pool } from '../db';
import { SecurityLogger } from './logger';
import { SecurityValidators } from './validators';
import { AccessPolicies } from './policies';
import { SecurityContext, UserRole } from '../types';

export interface AuthenticatedRequest extends Request {
  securityContext?: SecurityContext;
}

export class SecurityMiddleware {
  /**
   * Redis-backed API Rate Limiter.
   * Limits requests per IP address to prevent abuse and DDoS.
   */
  static rateLimiter(limit: number, windowSeconds: number) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const key = `rate_limit:${ip}`;

      try {
        const current = await redisClient.incr(key);
        
        if (current === 1) {
          await redisClient.expire(key, windowSeconds);
        }

        if (current > limit) {
          SecurityLogger.logEvent('rate_limit', `Rate limit exceeded (${limit} req / ${windowSeconds}s)`, ip);
          return res.status(429).json({ error: 'Too Many Requests. Please try again later.' });
        }

        next();
      } catch (error) {
        console.error('Rate Limiter Error:', error);
        // Fail open to prevent blocking legitimate traffic if Redis goes down, but log it
        next();
      }
    };
  }

  /**
   * Enhanced Authentication Middleware.
   * Validates session, retrieves user role, and builds the SecurityContext.
   */
  static async requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      SecurityLogger.logEvent('auth_failure', 'Missing or invalid authorization header format', ip);
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const userId = await AuthService.validateSession(token);
      if (!userId) {
        SecurityLogger.logEvent('auth_failure', 'Invalid or expired session token used', ip);
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
      }

      // Fetch user role to build full security context
      const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: 'Unauthorized: User no longer exists' });
      }

      const role = userResult.rows[0].role as UserRole;
      const permissions = AccessPolicies.getPermissionsForRole(role);

      req.securityContext = {
        userId,
        role,
        permissions,
        ipAddress: ip,
        userAgent: req.headers['user-agent'] || 'unknown'
      };

      next();
    } catch (error) {
      console.error('Auth Middleware Error:', error);
      res.status(500).json({ error: 'Internal server error during authentication' });
    }
  }

  /**
   * Role-Based Access Control Middleware.
   * Ensures the user has the required role to access an endpoint.
   */
  static requireRole(allowedRoles: UserRole[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.securityContext) {
        return res.status(401).json({ error: 'Unauthorized: Security context missing' });
      }

      if (!allowedRoles.includes(req.securityContext.role)) {
        SecurityLogger.logEvent(
          'unauthorized_access', 
          `User attempted to access endpoint requiring roles: ${allowedRoles.join(', ')}`, 
          req.securityContext.ipAddress, 
          req.securityContext.userId
        );
        return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
      }

      next();
    };
  }

  /**
   * Input Sanitization and Prompt Injection Protection Middleware.
   * Scans req.body for malicious payloads before processing.
   */
  static sanitizeAndValidateInput(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = req.securityContext?.userId;

    if (req.body) {
      // Deep clone and sanitize string fields
      const sanitizeObject = (obj: any) => {
        for (const key in obj) {
          if (typeof obj[key] === 'string') {
            // Check for prompt injection on specific fields (e.g., 'content', 'query')
            if (['content', 'query', 'prompt'].includes(key)) {
              if (!SecurityValidators.isPromptSafe(obj[key], ip, userId)) {
                throw new Error('SecurityError: Malicious payload or prompt injection detected.');
              }
            }
            // Sanitize all strings
            obj[key] = SecurityValidators.sanitizeInput(obj[key]);
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
          }
        }
      };

      try {
        sanitizeObject(req.body);
      } catch (error: any) {
        return res.status(400).json({ error: error.message });
      }
    }

    next();
  }
}
