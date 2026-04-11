import { Request, Response, NextFunction } from 'express';
import { sanitizeContent } from '../utils/sanitizeHtml';

/**
 * Middleware that sanitizes HTML in specific request body fields.
 * Applied to POST/PUT routes that accept user-authored content.
 * Defense-in-depth: complements client-side DOMPurify sanitization.
 */
const HTML_FIELDS = ['content', 'description', 'references', 'source'];

export function sanitizeContentMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    for (const field of HTML_FIELDS) {
      if (typeof req.body[field] === 'string' && req.body[field].includes('<')) {
        req.body[field] = sanitizeContent(req.body[field]);
      }
    }
  }
  next();
}

export default sanitizeContentMiddleware;
