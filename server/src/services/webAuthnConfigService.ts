'use strict';

import type { WikitruthRequest } from '../types/http';

export interface WebAuthnRuntimeConfig {
  enabled: boolean;
  rpId: string;
  rpName: string;
  origins: string[];
  canonicalOrigin: string;
  trustedTenantOrigins: string[];
  challengeTtlSeconds: number;
  handoffTtlSeconds: number;
  stepUpMaxAgeSeconds: number;
  recoveryCodeCount: number;
  adminStepUpRequired: boolean;
  passwordlessEnabled: boolean;
}

function normalizeOrigin(value: unknown): string {
  try {
    const parsed = new URL(String(value || '').trim());
    if (
      parsed.protocol !== 'https:' &&
      !(parsed.protocol === 'http:' && parsed.hostname === 'localhost')
    ) {
      return '';
    }
    return parsed.origin;
  } catch (_error) {
    return '';
  }
}

function firstForwardedValue(value: unknown): string {
  return (String(value || '').split(',').at(0) || '').trim();
}

function isLoopbackAddress(value: unknown): boolean {
  const address = String(value || '').trim().toLowerCase();
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

function usesTrustedLocalProxy(req: WikitruthRequest): boolean {
  const app = req.app as unknown as {
    config?: { trustProxy?: boolean };
    get?: (name: string) => unknown;
  };
  const proxyConfigured = app.config?.trustProxy === true || Boolean(app.get?.('trust proxy'));
  return proxyConfigured && isLoopbackAddress(req.socket?.remoteAddress);
}

function positiveInt(value: unknown, fallback: number, maximum: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), maximum) : fallback;
}

export function getWebAuthnConfig(req: WikitruthRequest): WebAuthnRuntimeConfig {
  const raw =
    (req.app as unknown as { config?: { webAuthn?: Partial<WebAuthnRuntimeConfig> } }).config
      ?.webAuthn || {};
  const canonicalOrigin = normalizeOrigin(raw.canonicalOrigin);
  const origins = Array.from(new Set((raw.origins || []).map(normalizeOrigin).filter(Boolean)));
  const rpId = String(raw.rpId || '')
    .trim()
    .toLowerCase();
  if (raw.enabled !== false && (!rpId || !canonicalOrigin || origins.length === 0)) {
    throw new Error(
      'WebAuthn requires a relying-party ID, canonical origin, and exact origin allowlist'
    );
  }
  return {
    enabled: raw.enabled !== false,
    rpId,
    rpName: String(raw.rpName || 'Wikitruth').trim() || 'Wikitruth',
    origins,
    canonicalOrigin,
    trustedTenantOrigins: Array.from(
      new Set((raw.trustedTenantOrigins || []).map(normalizeOrigin).filter(Boolean))
    ),
    challengeTtlSeconds: positiveInt(raw.challengeTtlSeconds, 300, 900),
    handoffTtlSeconds: positiveInt(raw.handoffTtlSeconds, 120, 600),
    stepUpMaxAgeSeconds: positiveInt(raw.stepUpMaxAgeSeconds, 600, 3600),
    recoveryCodeCount: positiveInt(raw.recoveryCodeCount, 10, 20),
    adminStepUpRequired: raw.adminStepUpRequired === true,
    passwordlessEnabled: raw.passwordlessEnabled !== false,
  };
}

export function getRequestOrigin(req: WikitruthRequest): string {
  let protocol = String(req.protocol || '').trim().toLowerCase();
  let host = String(req.get('host') || '').trim();

  // Kraken can reset Express' derived protocol after application settings are
  // applied. Accept forwarded origin data only from the explicitly configured
  // loopback proxy; direct requests must continue to use the socket-derived
  // protocol and Host header.
  if (usesTrustedLocalProxy(req)) {
    const forwardedProtocol = firstForwardedValue(req.get('x-forwarded-proto')).toLowerCase();
    const forwardedHost = firstForwardedValue(req.get('x-forwarded-host'));
    if (forwardedProtocol === 'http' || forwardedProtocol === 'https') {
      protocol = forwardedProtocol;
    }
    if (forwardedHost) {
      host = forwardedHost;
    }
  }

  return normalizeOrigin(`${protocol}://${host}`);
}

export function isCanonicalAuthOrigin(req: WikitruthRequest): boolean {
  const config = getWebAuthnConfig(req);
  return Boolean(config.enabled && getRequestOrigin(req) === config.canonicalOrigin);
}

export function requireCanonicalAuthOrigin(req: WikitruthRequest): WebAuthnRuntimeConfig {
  const config = getWebAuthnConfig(req);
  if (!config.enabled) throw new Error('Passkey authentication is disabled');
  if (getRequestOrigin(req) !== config.canonicalOrigin) {
    throw new Error(`Passkey authentication must continue on ${config.canonicalOrigin}`);
  }
  if (!config.origins.includes(config.canonicalOrigin)) {
    throw new Error('Canonical authentication origin is not in the WebAuthn origin allowlist');
  }
  return config;
}

export function safeRelativeReturnPath(value: unknown): string {
  const candidate = String(value || '').trim();
  if (!candidate.startsWith('/') || candidate.startsWith('//') || /[\r\n]/.test(candidate))
    return '/';
  return candidate;
}

export function normalizeTrustedOrigin(value: unknown): string {
  return normalizeOrigin(value);
}
