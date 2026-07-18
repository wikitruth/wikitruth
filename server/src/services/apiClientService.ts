'use strict';

import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export const AGENT_TOKEN_PREFIX = 'wt_agent_';
export const API_CLIENT_SCOPES = [
  'entries:read',
  'contributions:write',
  'graph:write',
  'civic:write',
  'moderation:write',
  'admin:write',
] as const;

export type ApiClientScope = (typeof API_CLIENT_SCOPES)[number];

export type ApiClientIdentity = {
  id: string;
  clientId: string;
  name: string;
  userId: string;
  tokenPrefix: string;
  scopes: ApiClientScope[];
  rateLimitPerMinute: number;
  expiresAt: Date | null;
};

export function hashApiClientSecret(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex');
}

export function generateApiClientToken(clientId = randomBytes(12).toString('hex')): {
  clientId: string;
  token: string;
  tokenPrefix: string;
  secretHash: string;
} {
  const secret = randomBytes(32).toString('base64url');
  const token = `${AGENT_TOKEN_PREFIX}${clientId}.${secret}`;
  return {
    clientId,
    token,
    tokenPrefix: `${AGENT_TOKEN_PREFIX}${clientId}.${secret.slice(0, 6)}`,
    secretHash: hashApiClientSecret(secret),
  };
}

export function parseApiClientToken(raw: unknown): { clientId: string; secret: string } | null {
  const token = String(raw || '').trim();
  const match = /^wt_agent_([a-f\d]{24})\.([A-Za-z0-9_-]{32,})$/.exec(token);
  return match?.[1] && match[2] ? { clientId: match[1], secret: match[2] } : null;
}

export function apiClientSecretsMatch(expectedHash: string, secret: string): boolean {
  const expected = Buffer.from(String(expectedHash || ''), 'hex');
  const candidate = Buffer.from(hashApiClientSecret(secret), 'hex');
  return expected.length === candidate.length && expected.length > 0 && timingSafeEqual(expected, candidate);
}

export function normalizeApiClientScopes(value: unknown, options: { allowAdmin?: boolean } = {}): ApiClientScope[] {
  const requested = Array.isArray(value) ? value : [];
  return Array.from(new Set(requested
    .map((scope) => String(scope || '').trim())
    .filter((scope): scope is ApiClientScope => (
      API_CLIENT_SCOPES.includes(scope as ApiClientScope)
        && (scope !== 'admin:write' || options.allowAdmin === true)
    ))));
}

export function toApiClientIdentity(client: Record<string, unknown>): ApiClientIdentity {
  return {
    id: String(client._id || ''),
    clientId: String(client.clientId || ''),
    name: String(client.name || ''),
    userId: String(client.userId || ''),
    tokenPrefix: String(client.tokenPrefix || ''),
    scopes: normalizeApiClientScopes(client.scopes, { allowAdmin: true }),
    rateLimitPerMinute: Math.max(10, Math.min(600, Number(client.rateLimitPerMinute || 60))),
    expiresAt: client.expiresAt ? new Date(String(client.expiresAt)) : null,
  };
}
