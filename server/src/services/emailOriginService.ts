import type { WikitruthRequest } from '../types/http';
import { getWebAuthnConfig } from './webAuthnConfigService';

function trustedConfiguredOrigin(value: unknown): string {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol === 'https:' || (url.protocol === 'http:' && url.hostname === 'localhost')) return url.origin;
  } catch (_error) {
    // Invalid configuration is handled by the production guard below.
  }
  return '';
}

export function getTrustedEmailOrigin(req: WikitruthRequest): string {
  try {
    const canonical = getWebAuthnConfig(req).canonicalOrigin;
    if (canonical) return canonical;
  } catch (_error) {
    // Password-only development installs may not have WebAuthn configured.
  }
  const homeUrl = (req.app as unknown as { config?: { homeUrl?: unknown } }).config?.homeUrl;
  const configured = trustedConfiguredOrigin(homeUrl);
  if (configured) return configured;
  if (process.env.NODE_ENV !== 'production') return 'http://localhost';
  throw new Error('A trusted public origin is required for email action links');
}
