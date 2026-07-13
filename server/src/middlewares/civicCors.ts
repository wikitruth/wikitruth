'use strict';

import type { NextFunction, Request, Response } from 'express';

const CIVIC_API_PATH = /^\/api\/v1\/tenants\/[^/]+\/civic(?:\/|$)/;
const ALLOWED_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
const ALLOWED_HEADERS = 'Authorization,Content-Type,X-CSRF-Token,X-Client-Platform,X-Client-Version,X-Client-Build';

function normalizeOrigin(value: string): string {
  try {
    const url = new URL(value.trim());
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return '';
  }
}

function allowedOrigins(): Set<string> {
  return new Set(
    String(process.env.CIVIC_CORS_ORIGINS || '')
      .split(',')
      .map(normalizeOrigin)
      .filter(Boolean),
  );
}

export function civicCors(req: Request, res: Response, next: NextFunction): void {
  if (!CIVIC_API_PATH.test(req.path)) {
    next();
    return;
  }
  const origin = normalizeOrigin(String(req.get('origin') || ''));
  if (!origin || !allowedOrigins().has(origin)) {
    next();
    return;
  }

  res.vary('Origin');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
  res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
}
