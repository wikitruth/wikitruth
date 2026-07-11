'use strict';

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

type SameSite = boolean | 'lax' | 'strict' | 'none';

interface CsrfProtectionOptions {
  ignoreMethods?: string[];
  skip?: (req: Request) => boolean;
  cookie?: {
    key?: string;
    signed?: boolean;
    secure?: boolean;
    sameSite?: SameSite;
  };
}

interface CsrfError extends Error {
  code: 'EBADCSRFTOKEN';
  status: 403;
  statusCode: 403;
}

const DEFAULT_IGNORED_METHODS = ['GET', 'HEAD', 'OPTIONS'];
const TOKEN_CONTEXT = 'wikitruth-csrf-v1';

function readString(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return null;
}

function readRequestToken(req: Request): string | null {
  const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null;
  const query = req.query as Record<string, unknown>;

  return (
    readString(body?._csrf) ||
    readString(query._csrf) ||
    readString(req.headers['csrf-token']) ||
    readString(req.headers['xsrf-token']) ||
    readString(req.headers['x-csrf-token']) ||
    readString(req.headers['x-xsrf-token'])
  );
}

function createToken(secret: string): string {
  return createHmac('sha256', secret).update(TOKEN_CONTEXT).digest('base64url');
}

function tokensMatch(expected: string, candidate: string | null): boolean {
  if (!candidate) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const candidateBuffer = Buffer.from(candidate);
  return expectedBuffer.length === candidateBuffer.length && timingSafeEqual(expectedBuffer, candidateBuffer);
}

function invalidTokenError(): CsrfError {
  const error = new Error('Invalid CSRF token') as CsrfError;
  error.code = 'EBADCSRFTOKEN';
  error.status = 403;
  error.statusCode = 403;
  return error;
}

function createCsrfProtection(options: CsrfProtectionOptions = {}): RequestHandler {
  const cookieOptions = options.cookie || {};
  const cookieKey = cookieOptions.key || '_csrf';
  const signed = cookieOptions.signed !== false;
  const ignoredMethods = new Set((options.ignoreMethods || DEFAULT_IGNORED_METHODS).map((method) => method.toUpperCase()));

  return function csrfProtection(req: Request, res: Response, next: NextFunction) {
    const cookieJar = signed ? req.signedCookies : req.cookies;
    let secret = readString(cookieJar?.[cookieKey]);

    if (!secret) {
      secret = randomBytes(32).toString('base64url');
      res.cookie(cookieKey, secret, {
        httpOnly: true,
        path: '/',
        sameSite: cookieOptions.sameSite || 'lax',
        secure: !!cookieOptions.secure,
        signed: signed,
      });
    }

    const token = createToken(secret);
    req.csrfToken = function csrfToken() {
      return token;
    };

    if (options.skip?.(req) || ignoredMethods.has(req.method.toUpperCase())) {
      next();
      return;
    }

    if (!tokensMatch(token, readRequestToken(req))) {
      next(invalidTokenError());
      return;
    }

    next();
  };
}

export { createCsrfProtection };
export type { CsrfProtectionOptions };
