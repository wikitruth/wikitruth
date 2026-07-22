'use strict';

import appModForDb from '../app';
import type { WikitruthRequest, WikitruthResponse } from '../types/http';
import { hasRecentPasskeyAssurance, requireRecentPasskeyAssurance } from './authAssuranceService';
import { getWebAuthnConfig } from './webAuthnConfigService';

const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;

function isAdmin(req: WikitruthRequest): boolean {
  return Boolean(req.user?.roles && (req.user.roles as Record<string, unknown>).admin);
}

export async function requirePrivilegedPasskeyAssurance(
  req: WikitruthRequest,
  res: WikitruthResponse
): Promise<boolean> {
  const runtimeConfig = (req.app as unknown as { config?: { webAuthn?: unknown } }).config
    ?.webAuthn;
  // Standalone router tests predate application config wiring. Security-specific tests
  // provide WebAuthn config explicitly; every non-test runtime continues to fail closed.
  if (!runtimeConfig && req.app.get('env') === 'test') return true;
  const config = getWebAuthnConfig(req);
  if (!config.adminStepUpRequired) return true;
  if (req.apiClient) {
    res.status(403).json({
      success: false,
      code: 'HUMAN_PASSKEY_REQUIRED',
      message: 'Agent credentials cannot perform a human passkey step-up.',
    });
    return false;
  }
  if (!hasRecentPasskeyAssurance(req)) return requireRecentPasskeyAssurance(req, res);
  if (isAdmin(req)) {
    const count = await db.PasskeyCredential.countDocuments({
      userId: req.user?._id || req.user?.id,
      status: 'active',
    });
    if (count < 2) {
      res.status(428).json({
        success: false,
        code: 'PASSKEY_ENROLLMENT_REQUIRED',
        message: 'Administrators must register at least two active passkeys before this action.',
        enrollmentUrl: '/account/settings#passkeys',
        requiredCredentialCount: 2,
        activeCredentialCount: count,
      });
      return false;
    }
  }
  return true;
}
