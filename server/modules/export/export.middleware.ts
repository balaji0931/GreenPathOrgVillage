/**
 * Export Middleware - Rate limiting for CSV exports.
 * 10 exports per user per hour, tracked in-memory.
 */
import type { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const MAX_EXPORTS_PER_HOUR = 10;
const HOUR_MS = 60 * 60 * 1000;

// Clean up expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  Array.from(rateLimitMap.entries()).forEach(([key, entry]) => {
    if (entry.resetAt <= now) {
      rateLimitMap.delete(key);
    }
  });
}, 10 * 60 * 1000);

/**
 * Rate limiting middleware for export endpoints.
 * Allows 10 exports per user per hour.
 */
export function rateLimitExport(req: Request, res: Response, next: NextFunction): void {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const key = `export:${userId}`;
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetAt <= now) {
    // First request or window expired
    rateLimitMap.set(key, { count: 1, resetAt: now + HOUR_MS });
    next();
    return;
  }

  if (entry.count >= MAX_EXPORTS_PER_HOUR) {
    const minutesLeft = Math.ceil((entry.resetAt - now) / (60 * 1000));
    res.status(429).json({
      message: `Export rate limit exceeded. Try again in ${minutesLeft} minutes.`,
      retryAfterMinutes: minutesLeft,
    });
    return;
  }

  entry.count++;
  next();
}
