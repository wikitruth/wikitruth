'use strict';

import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export const AGENT_TOKEN_PREFIX = 'wt_agent_';
export const API_CLIENT_SCOPES = [
  'entries:read',
  'entries:create',
  'entries:propose-edit',
  'contributions:write',
  'graph:write',
  'civic:read',
  'civic:contribute',
  'civic:write',
  'moderation:advise',
  'moderation:write',
  'translations:write',
  'debates:participate',
  'agent:runs:read',
] as const;

export type ApiClientScope = (typeof API_CLIENT_SCOPES)[number];

export const ENTRY_TYPE_NAMES = ['topic', 'argument', 'question', 'answer', 'artifact', 'issue', 'opinion'] as const;
export type ApiClientEntryType = (typeof ENTRY_TYPE_NAMES)[number];
export type ApiClientPolicy = {
  tenantIds: string[];
  entryTypes: ApiClientEntryType[];
  parentRootIds: string[];
  ownContentOnly: boolean;
  maxVisibility: 'public_only' | 'owned_private';
  sourceRequired: boolean;
  maxBatchSize: number;
};

export type ApiClientIdentity = {
  id: string;
  clientId: string;
  name: string;
  userId: string;
  tokenPrefix: string;
  scopes: ApiClientScope[];
  rateLimitPerMinute: number;
  expiresAt: Date | null;
  policy: ApiClientPolicy;
};

const LEGACY_SCOPE_EXPANSIONS: Partial<Record<ApiClientScope, ApiClientScope[]>> = {
  'contributions:write': ['entries:create', 'entries:propose-edit'],
  'civic:write': ['civic:read', 'civic:contribute'],
  'moderation:write': ['moderation:advise'],
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

export function normalizeApiClientScopes(value: unknown): ApiClientScope[] {
  const requested = Array.isArray(value) ? value : [];
  const valid = requested
    .map((scope) => String(scope || '').trim())
    .filter((scope): scope is ApiClientScope => API_CLIENT_SCOPES.includes(scope as ApiClientScope));
  return Array.from(new Set(valid.flatMap((scope) => LEGACY_SCOPE_EXPANSIONS[scope] || [scope])
    .filter((scope) => !Object.prototype.hasOwnProperty.call(LEGACY_SCOPE_EXPANSIONS, scope))));
}

export function normalizeApiClientPolicy(value: unknown): ApiClientPolicy {
  const policy = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const stringList = (input: unknown, pattern?: RegExp): string[] => Array.from(new Set(
    (Array.isArray(input) ? input : []).map((item) => String(item || '').trim().toLowerCase())
      .filter((item) => item && (!pattern || pattern.test(item))).slice(0, 100),
  ));
  const entryTypes = stringList(policy.entryTypes)
    .filter((item): item is ApiClientEntryType => ENTRY_TYPE_NAMES.includes(item as ApiClientEntryType));
  const requestedBatchSize = Number(policy.maxBatchSize || 25);
  return {
    tenantIds: stringList(policy.tenantIds, /^[a-z0-9][a-z0-9-]{1,62}$/),
    entryTypes: entryTypes.length ? entryTypes : [...ENTRY_TYPE_NAMES],
    parentRootIds: stringList(policy.parentRootIds, /^[a-f\d]{24}$/i),
    ownContentOnly: policy.ownContentOnly !== false,
    maxVisibility: policy.maxVisibility === 'owned_private' ? 'owned_private' : 'public_only',
    sourceRequired: policy.sourceRequired === true,
    maxBatchSize: Number.isFinite(requestedBatchSize) ? Math.max(1, Math.min(100, requestedBatchSize)) : 25,
  };
}

export function toApiClientIdentity(client: Record<string, unknown>): ApiClientIdentity {
  return {
    id: String(client._id || ''),
    clientId: String(client.clientId || ''),
    name: String(client.name || ''),
    userId: String(client.userId || ''),
    tokenPrefix: String(client.tokenPrefix || ''),
    scopes: normalizeApiClientScopes(client.scopes),
    rateLimitPerMinute: Math.max(10, Math.min(600, Number(client.rateLimitPerMinute || 60))),
    expiresAt: client.expiresAt ? new Date(String(client.expiresAt)) : null,
    policy: normalizeApiClientPolicy(client.policy),
  };
}
