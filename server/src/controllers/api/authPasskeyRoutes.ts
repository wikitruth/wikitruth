'use strict';

import type { Router } from 'express';
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import appModForDb from '../../app';
import constants from '../../models/constants';
import {
  establishAuthenticatedSession,
  getAuthenticationAssurance,
  hasRecentPasskeyAssurance,
  hasRecentRecoveryAssurance,
  requireRecentPasskeyAssurance,
  saveSession,
  setAuthenticationAssurance,
} from '../../services/authAssuranceService';
import { consumeAuthHandoff, createAuthHandoff } from '../../services/authHandoffService';
import { logEntryEvent } from '../../services/entryEventsService';
import {
  consumeRecoveryCode,
  recoveryCodeStatus,
  replaceRecoveryCodes,
} from '../../services/recoveryCodeService';
import { getWebAuthnConfig, isCanonicalAuthOrigin } from '../../services/webAuthnConfigService';
import {
  countActivePasskeys,
  createPasskeyAuthenticationOptions,
  createPasskeyRegistrationOptions,
  createPasswordlessSignupOptions,
  listPasskeyCredentials,
  renamePasskey,
  revokePasskey,
  verifyPasskeyAuthentication,
  verifyPasskeyRegistration,
  verifyPasswordlessSignup,
} from '../../services/webAuthnService';
import { revokeOtherWebSessions } from '../../services/webSessionService';
import { buildPasskeyRuntimeConfig } from '../../services/authRuntimeConfigService';
import {
  getAccountIdFromUser,
  getDefaultActiveRole,
  isValidEmail,
  isValidUsername,
  isLoginAttemptBlocked,
  recordFailedLoginAttempt,
  sanitizeUser,
  setSessionActiveRole,
  validateRecaptcha,
  type AuthUserDocument,
} from './authHelpers';

const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;

function userId(req: WikitruthRequest): string {
  return String(req.user?._id || req.user?.id || '');
}

function requireUser(req: WikitruthRequest, res: WikitruthResponse): boolean {
  if (req.user) return true;
  res.status(401).json({ success: false, message: 'Authentication required' });
  return false;
}

function messageOf(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Passkey operation failed';
}

async function auditUserEvent(
  req: WikitruthRequest,
  eventType: string,
  message: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  await logEntryEvent({
    scope: 'privileged',
    eventType,
    objectType: constants.OBJECT_TYPES.user,
    objectName: 'user',
    objectId: userId(req),
    actorUserId: userId(req),
    actorUsername: String(req.user?.username || ''),
    message,
    payload,
  });
}

export function registerAuthPasskeyRoutes(router: Router): void {
  router.get('/passkeys/config', function (req: WikitruthRequest, res: WikitruthResponse) {
    res.json({
      success: true,
      passkeys: buildPasskeyRuntimeConfig(req),
    });
  });

  router.post(
    '/passkeys/signup/options',
    async function (req: WikitruthRequest, res: WikitruthResponse) {
      const username = String(req.body?.username || '').trim();
      const email = String(req.body?.email || '')
        .trim()
        .toLowerCase();
      if (!isValidUsername(username) || !isValidEmail(email)) {
        res
          .status(400)
          .json({ success: false, message: 'A valid username and email are required' });
        return;
      }
      if (!(await validateRecaptcha(req, String(req.body?.recaptchaResponse || '')))) {
        res.status(400).json({ success: false, message: 'Invalid captcha' });
        return;
      }
      const duplicate = await db.User.findOne({ $or: [{ username }, { email }] }).lean();
      if (duplicate) {
        res
          .status(409)
          .json({ success: false, message: 'Username or email is already registered' });
        return;
      }
      try {
        const result = await createPasswordlessSignupOptions(req, { username, email });
        res.json({ success: true, ...result });
      } catch (error) {
        res.status(400).json({ success: false, message: messageOf(error) });
      }
    }
  );

  router.post(
    '/passkeys/signup/verify',
    async function (req: WikitruthRequest, res: WikitruthResponse) {
      try {
        const result = await verifyPasswordlessSignup({
          req,
          ceremonyId: req.body?.ceremonyId,
          response: req.body?.response as RegistrationResponseJSON,
          name: req.body?.name,
        });
        await establishAuthenticatedSession(req, result.user, 'passkey', {
          passkeyVerifiedAt: result.verifiedAt,
          passkeyCredentialId: result.credential.id,
          rememberMe: Boolean(req.body?.rememberMe),
        });
        setSessionActiveRole(req, 'reader');
        await saveSession(req);
        res.status(201).json({
          success: true,
          user: sanitizeUser(result.user as unknown as AuthUserDocument),
          activeRole: 'reader',
          credential: result.credential,
          assurance: getAuthenticationAssurance(req),
        });
      } catch (error) {
        res
          .status(/registered/i.test(messageOf(error)) ? 409 : 400)
          .json({ success: false, message: messageOf(error) });
      }
    }
  );

  router.get('/passkeys', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!requireUser(req, res)) return;
    const [credentials, recovery] = await Promise.all([
      listPasskeyCredentials(userId(req)),
      recoveryCodeStatus(userId(req)),
    ]);
    const storedUser = await db.User.findById(userId(req)).lean();
    res.json({
      success: true,
      credentials,
      recovery,
      passwordLoginDisabled: Boolean(storedUser?.passwordLoginDisabled),
      assurance: getAuthenticationAssurance(req),
    });
  });

  router.post(
    '/passkeys/registration/options',
    async function (req: WikitruthRequest, res: WikitruthResponse) {
      if (!requireUser(req, res)) return;
      try {
        const count = await countActivePasskeys(userId(req));
        if (count > 0 && !hasRecentPasskeyAssurance(req) && !hasRecentRecoveryAssurance(req)) {
          requireRecentPasskeyAssurance(req, res);
          return;
        }
        const result = await createPasskeyRegistrationOptions(
          req,
          req.user as unknown as AuthUserDocument
        );
        res.json({ success: true, ...result });
      } catch (error) {
        res.status(400).json({ success: false, message: messageOf(error) });
      }
    }
  );

  router.post(
    '/passkeys/registration/verify',
    async function (req: WikitruthRequest, res: WikitruthResponse) {
      if (!requireUser(req, res)) return;
      try {
        const credential = await verifyPasskeyRegistration({
          req,
          user: req.user as unknown as AuthUserDocument,
          ceremonyId: req.body?.ceremonyId,
          response: req.body?.response as RegistrationResponseJSON,
          name: req.body?.name,
        });
        const verifiedAt = new Date().toISOString();
        setAuthenticationAssurance(req, 'passkey', {
          passkeyVerifiedAt: verifiedAt,
          passkeyCredentialId: credential.id,
        });
        await saveSession(req);
        res
          .status(201)
          .json({ success: true, credential, assurance: getAuthenticationAssurance(req) });
      } catch (error) {
        res
          .status(/duplicate/i.test(messageOf(error)) ? 409 : 400)
          .json({ success: false, message: messageOf(error) });
      }
    }
  );

  router.post(
    '/passkeys/authentication/options',
    async function (req: WikitruthRequest, res: WikitruthResponse) {
      const purpose = req.body?.purpose === 'step_up' ? 'step_up' : 'authentication';
      if (purpose === 'step_up' && !requireUser(req, res)) return;
      try {
        const result = await createPasskeyAuthenticationOptions(
          req,
          purpose,
          purpose === 'step_up' ? (req.user as unknown as AuthUserDocument) : undefined
        );
        res.json({ success: true, purpose, ...result });
      } catch (error) {
        res.status(400).json({ success: false, message: messageOf(error) });
      }
    }
  );

  router.post(
    '/passkeys/authentication/verify',
    async function (req: WikitruthRequest, res: WikitruthResponse) {
      const purpose = req.body?.purpose === 'step_up' ? 'step_up' : 'authentication';
      if (purpose === 'step_up' && !requireUser(req, res)) return;
      try {
        const result = await verifyPasskeyAuthentication({
          req,
          ceremonyId: req.body?.ceremonyId,
          purpose,
          response: req.body?.response as AuthenticationResponseJSON,
          expectedUser:
            purpose === 'step_up' ? (req.user as unknown as AuthUserDocument) : undefined,
        });
        if (purpose === 'authentication') {
          await establishAuthenticatedSession(req, result.user, 'passkey', {
            passkeyVerifiedAt: result.verifiedAt,
            passkeyCredentialId: result.credential.id,
            rememberMe: Boolean(req.body?.rememberMe),
          });
        } else {
          setAuthenticationAssurance(req, 'passkey', {
            passkeyVerifiedAt: result.verifiedAt,
            passkeyCredentialId: result.credential.id,
          });
          await saveSession(req);
        }
        const activeRole = getDefaultActiveRole(result.user);
        setSessionActiveRole(req, activeRole);
        await saveSession(req);
        res.json({
          success: true,
          user: sanitizeUser(result.user),
          activeRole,
          credential: result.credential,
          assurance: getAuthenticationAssurance(req),
        });
      } catch (error) {
        res.status(401).json({ success: false, message: messageOf(error) });
      }
    }
  );

  router.patch('/passkeys/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!requireUser(req, res) || !requireRecentPasskeyAssurance(req, res)) return;
    try {
      const credentialId = String(req.params.id || '');
      const credential = await renamePasskey(
        req.user as unknown as AuthUserDocument,
        credentialId,
        req.body?.name
      );
      res.json({ success: true, credential });
    } catch (error) {
      res.status(400).json({ success: false, message: messageOf(error) });
    }
  });

  router.delete('/passkeys/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!requireUser(req, res) || !requireRecentPasskeyAssurance(req, res)) return;
    try {
      const credentialId = String(req.params.id || '');
      const config = getWebAuthnConfig(req);
      const count = await countActivePasskeys(userId(req));
      const storedUser = await db.User.findById(userId(req)).lean();
      const adminProtected = Boolean(storedUser?.roles?.admin && config.adminStepUpRequired);
      const passwordlessProtected = Boolean(storedUser?.passwordLoginDisabled);
      if ((adminProtected || passwordlessProtected) && count <= 2) {
        res
          .status(409)
          .json({ success: false, message: 'Keep at least two active passkeys for this account' });
        return;
      }
      if (getAuthenticationAssurance(req)?.passkeyCredentialId === credentialId) {
        res.status(409).json({
          success: false,
          message: 'Authenticate with another passkey before revoking this one',
        });
        return;
      }
      const credential = await revokePasskey(
        req.user as unknown as AuthUserDocument,
        credentialId
      );
      res.json({ success: true, credential });
    } catch (error) {
      res.status(400).json({ success: false, message: messageOf(error) });
    }
  });

  router.get(
    '/recovery-codes/status',
    async function (req: WikitruthRequest, res: WikitruthResponse) {
      if (!requireUser(req, res)) return;
      res.json({ success: true, recovery: await recoveryCodeStatus(userId(req)) });
    }
  );

  router.post('/recovery-codes', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!requireUser(req, res) || !requireRecentPasskeyAssurance(req, res)) return;
    const config = getWebAuthnConfig(req);
    const codes = await replaceRecoveryCodes(userId(req), config.recoveryCodeCount);
    await auditUserEvent(
      req,
      'auth.recovery-codes.replaced',
      'Generated a new recovery-code batch',
      { count: codes.length }
    );
    res.status(201).json({ success: true, codes, returnedOnce: true });
  });

  router.post(
    '/recovery-codes/login',
    async function (req: WikitruthRequest, res: WikitruthResponse) {
      const identity = String(req.body?.username || '').trim();
      const rateKey = `recovery:${identity.toLowerCase()}`;
      if (!identity || !req.body?.code) {
        res
          .status(400)
          .json({ success: false, message: 'Username or email and recovery code are required' });
        return;
      }
      if (await isLoginAttemptBlocked(req, rateKey)) {
        res
          .status(429)
          .json({ success: false, message: 'Too many recovery attempts. Please try again later.' });
        return;
      }
      const user = await db.User.findOne({
        $or: [{ username: identity }, { email: identity.toLowerCase() }],
      });
      if (!user || !(await consumeRecoveryCode(String(user._id), req.body.code))) {
        await recordFailedLoginAttempt(req, rateKey);
        res.status(401).json({ success: false, message: 'Invalid recovery credentials' });
        return;
      }
      await establishAuthenticatedSession(req, user, 'recovery_code', {
        rememberMe: Boolean(req.body?.rememberMe),
      });
      const activeRole = getDefaultActiveRole(user);
      setSessionActiveRole(req, activeRole);
      await saveSession(req);
      await revokeOtherWebSessions(req, String(user._id), 'account_recovery');
      await auditUserEvent(
        req,
        'auth.recovery-code.consumed',
        'Authenticated with a recovery code'
      );
      res.json({ success: true, user: sanitizeUser(user), activeRole, recoveryRequired: true });
    }
  );

  router.put('/password-login', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!requireUser(req, res)) return;
    const enabled = req.body?.enabled === true;
    const config = getWebAuthnConfig(req);
    if (!enabled) {
      if (!config.passwordlessEnabled) {
        res.status(403).json({ success: false, message: 'Passwordless accounts are disabled' });
        return;
      }
      if (!requireRecentPasskeyAssurance(req, res)) return;
      const [count, recovery] = await Promise.all([
        countActivePasskeys(userId(req)),
        recoveryCodeStatus(userId(req)),
      ]);
      const accountId = getAccountIdFromUser(req.user);
      const account = accountId ? await db.Account.findById(accountId).lean() : null;
      if (count < 2 || recovery.unusedCount < 1 || account?.isVerified !== 'yes') {
        res.status(409).json({
          success: false,
          message:
            'Verify your email, register two passkeys, and generate recovery codes before disabling password login',
        });
        return;
      }
    } else if (!hasRecentPasskeyAssurance(req) && !hasRecentRecoveryAssurance(req)) {
      res.status(428).json({
        success: false,
        code: 'RECENT_AUTH_REQUIRED',
        message: 'Recent passkey or recovery authentication is required',
      });
      return;
    }
    await db.User.findByIdAndUpdate(userId(req), { $set: { passwordLoginDisabled: !enabled } });
    await auditUserEvent(
      req,
      enabled ? 'auth.password-login.enabled' : 'auth.password-login.disabled',
      enabled ? 'Enabled password login' : 'Disabled password login'
    );
    res.json({ success: true, passwordLoginDisabled: !enabled });
  });

  router.post('/handoffs', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!requireUser(req, res)) return;
    try {
      const handoff = await createAuthHandoff(req, req.body?.targetOrigin, req.body?.returnPath);
      res.status(201).json({ success: true, handoff });
    } catch (error) {
      res.status(400).json({ success: false, message: messageOf(error) });
    }
  });

  router.post('/handoffs/exchange', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      const handoff = await consumeAuthHandoff(req, req.body?.code);
      const activeRole = getDefaultActiveRole(handoff.user);
      setSessionActiveRole(req, activeRole);
      await saveSession(req);
      res.json({
        success: true,
        user: sanitizeUser(handoff.user),
        activeRole,
        returnPath: handoff.returnPath,
        assurance: getAuthenticationAssurance(req),
      });
    } catch (error) {
      res.status(401).json({ success: false, message: messageOf(error) });
    }
  });
}
