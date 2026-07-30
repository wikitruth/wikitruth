'use strict';

import type { WikitruthRequest, WikitruthResponse } from '../types/http';
import { getWebAuthnConfig } from './webAuthnConfigService';
import {
  registerAuthenticatedWebSession,
  revokeCurrentWebSession,
} from './webSessionService';

export type AuthenticationMethod =
  'password' | 'oauth' | 'passkey' | 'email_code' | 'recovery_code' | 'fast_switch' | 'handoff';

export interface AuthenticationAssurance {
  method: AuthenticationMethod;
  authenticatedAt: string;
  passkeyVerifiedAt?: string;
  passkeyCredentialId?: string;
  recoveredAt?: string;
}

export interface SessionEstablishmentOptions extends Partial<AuthenticationAssurance> {
  rememberMe?: boolean;
}

export function getAuthenticationAssurance(req: WikitruthRequest): AuthenticationAssurance | null {
  const assurance = req.session.authentication;
  if (!assurance || typeof assurance !== 'object') return null;
  return assurance as AuthenticationAssurance;
}

export function setAuthenticationAssurance(
  req: WikitruthRequest,
  method: AuthenticationMethod,
  options: Partial<AuthenticationAssurance> = {}
): AuthenticationAssurance {
  const now = new Date().toISOString();
  const assurance: AuthenticationAssurance = {
    method,
    authenticatedAt: options.authenticatedAt || now,
    ...(options.passkeyVerifiedAt ? { passkeyVerifiedAt: options.passkeyVerifiedAt } : {}),
    ...(options.passkeyCredentialId ? { passkeyCredentialId: options.passkeyCredentialId } : {}),
    ...(method === 'recovery_code' ? { recoveredAt: options.recoveredAt || now } : {}),
  };
  req.session.authentication = assurance;
  return assurance;
}

export function hasRecentPasskeyAssurance(req: WikitruthRequest): boolean {
  const assurance = getAuthenticationAssurance(req);
  if (!assurance?.passkeyVerifiedAt) return false;
  const verifiedAt = new Date(assurance.passkeyVerifiedAt).getTime();
  if (!Number.isFinite(verifiedAt)) return false;
  const maxAgeMs = getWebAuthnConfig(req).stepUpMaxAgeSeconds * 1000;
  return Date.now() - verifiedAt >= 0 && Date.now() - verifiedAt <= maxAgeMs;
}

export function hasRecentRecoveryAssurance(req: WikitruthRequest): boolean {
  const assurance = getAuthenticationAssurance(req);
  if (assurance?.method !== 'recovery_code' || !assurance.recoveredAt) return false;
  const recoveredAt = new Date(assurance.recoveredAt).getTime();
  const maxAgeMs = getWebAuthnConfig(req).stepUpMaxAgeSeconds * 1000;
  return (
    Number.isFinite(recoveredAt) &&
    Date.now() - recoveredAt >= 0 &&
    Date.now() - recoveredAt <= maxAgeMs
  );
}

export async function establishAuthenticatedSession(
  req: WikitruthRequest,
  user: unknown,
  method: AuthenticationMethod,
  options: SessionEstablishmentOptions = {}
): Promise<void> {
  const preferences = req.session.preferences;
  const rememberMe = options.rememberMe ?? req.session.pendingRememberMe ?? false;
  await revokeCurrentWebSession(req, 'reauthenticated');
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate(error => (error ? reject(error) : resolve()));
  });
  await new Promise<void>((resolve, reject) => {
    req.login(user as never, (error?: unknown) => (error ? reject(error) : resolve()));
  });
  if (preferences) req.session.preferences = preferences;
  setAuthenticationAssurance(req, method, options);
  await registerAuthenticatedWebSession(req, method, rememberMe);
  await saveSession(req);
}

export async function saveSession(req: WikitruthRequest): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    req.session.save(error => (error ? reject(error) : resolve()));
  });
}

export function requireRecentPasskeyAssurance(
  req: WikitruthRequest,
  res: WikitruthResponse
): boolean {
  if (hasRecentPasskeyAssurance(req)) return true;
  const config = getWebAuthnConfig(req);
  res.status(428).json({
    success: false,
    code: 'PASSKEY_STEP_UP_REQUIRED',
    message: 'Confirm this action with a passkey.',
    stepUp: {
      method: 'passkey',
      optionsUrl: '/api/v1/auth/passkeys/authentication/options',
      maxAgeSeconds: config.stepUpMaxAgeSeconds,
    },
  });
  return false;
}
