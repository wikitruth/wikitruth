import { Request, Response, NextFunction } from 'express';
import { sanitizeContent } from '../utils/sanitizeHtml';

/**
 * Middleware that sanitizes HTML in specific request body fields.
 * Applied to POST/PUT routes that accept user-authored content.
 * Defense-in-depth: complements client-side DOMPurify sanitization.
 */
const HTML_FIELDS = new Set(['content', 'description', 'references', 'source', 'reason', 'message']);

function sanitizeObject(target: unknown): void {
  if (!target || typeof target !== 'object') {
    return;
  }

  if (Array.isArray(target)) {
    target.forEach((entry) => sanitizeObject(entry));
    return;
  }

  const row = target as Record<string, unknown>;
  for (const key of Object.keys(row)) {
    const value = row[key];
    if (typeof value === 'string') {
      if (HTML_FIELDS.has(key) && value.includes('<')) {
        row[key] = sanitizeContent(value);
      }
      continue;
    }

    if (value && typeof value === 'object') {
      sanitizeObject(value);
    }
  }
}

export function sanitizeContentMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  next();
}

export default sanitizeContentMiddleware;
