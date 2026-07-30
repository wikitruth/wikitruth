'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import constants from '../../models/constants';
import {
  completeEmailAuthSignup,
  createEmailAuthChallenge,
  EmailAuthError,
  getEmailAuthConfig,
  setEmailChallengeDelivery,
  verifyEmailAuthChallenge,
  verifyUserEmailOwnership,
} from '../../services/emailAuthService';
import { createAuthHandoff, listTrustedHandoffOrigins } from '../../services/authHandoffService';
import { establishAuthenticatedSession, saveSession } from '../../services/authAssuranceService';
import { getCivicTenantForHost } from '../../services/civicTenantService';
import { logEntryEvent } from '../../services/entryEventsService';
import {
  getWebAuthnConfig,
  isCanonicalAuthOrigin,
  normalizeTrustedOrigin,
  safeRelativeReturnPath,
} from '../../services/webAuthnConfigService';
import {
  deliverEmail,
  getDefaultActiveRole,
  isValidEmail,
  sanitizeUser,
  setSessionActiveRole,
  validateRecaptcha,
  type AuthAppContext,
  type AuthUserDocument,
} from './authHelpers';

const GENERIC_REQUEST_MESSAGE =
  'If this address can receive sign-in email, a one-time code has been sent.';

async function trustedTarget(req: WikitruthRequest, rawTarget: unknown): Promise<string> {
  const canonicalOrigin = getWebAuthnConfig(req).canonicalOrigin;
  const target = normalizeTrustedOrigin(rawTarget);
  if (!target || target === canonicalOrigin) return '';
  if (!(await listTrustedHandoffOrigins(req)).includes(target)) {
    throw new EmailAuthError('Authentication return destination is not trusted', 400, 'TARGET_NOT_TRUSTED');
  }
  return target;
}

function errorResponse(res: WikitruthResponse, error: unknown): void {
  if (error instanceof EmailAuthError) {
    res.status(error.statusCode).json({ success: false, code: error.code, message: error.message });
    return;
  }
  throw error;
}

async function auditAuthenticatedUser(
  user: Record<string, any>,
  message: string,
  payload: Record<string, unknown>
): Promise<void> {
  await logEntryEvent({
    scope: 'privileged',
    eventType: 'auth.email-code.authenticated',
    objectType: constants.OBJECT_TYPES.user,
    objectName: 'user',
    objectId: String(user._id || user.id || ''),
    actorUserId: String(user._id || user.id || ''),
    actorUsername: String(user.username || ''),
    message,
    payload,
  });
}

async function finishAuthentication(
  req: WikitruthRequest,
  user: AuthUserDocument,
  context: { rememberMe: boolean; targetOrigin: string; returnPath: string },
  created: boolean
) {
  await verifyUserEmailOwnership(user);
  await establishAuthenticatedSession(req, user, 'email_code', {
    rememberMe: context.rememberMe,
  });
  const activeRole = created
    ? 'reader'
    : getDefaultActiveRole(user);
  setSessionActiveRole(req, activeRole);
  await saveSession(req);
  const handoff = context.targetOrigin
    ? await createAuthHandoff(req, context.targetOrigin, context.returnPath)
    : null;
  await auditAuthenticatedUser(
    user,
    created ? 'Created an account with an email code' : 'Signed in with an email code',
    { created, remembered: context.rememberMe, tenantHandoff: Boolean(handoff) }
  );
  return {
    success: true,
    user: sanitizeUser(user),
    activeRole,
    created,
    handoff,
  };
}

export function registerAuthEmailCodeRoutes(router: Router): void {
  router.get('/email-code/config', (req: WikitruthRequest, res: WikitruthResponse) => {
    const config = getEmailAuthConfig(req);
    const webAuthn = getWebAuthnConfig(req);
    res.json({
      success: true,
      emailCode: {
        enabled: config.enabled,
        codeLength: 6,
        expiresInSeconds: config.codeTtlSeconds,
        resendDelaySeconds: config.resendDelaySeconds,
        canonicalOrigin: webAuthn.canonicalOrigin,
        isCanonicalOrigin: isCanonicalAuthOrigin(req),
      },
    });
  });

  router.post('/email-code/request', async (req: WikitruthRequest, res: WikitruthResponse, next) => {
    try {
      const config = getEmailAuthConfig(req);
      if (!config.enabled) throw new EmailAuthError('Email sign-in is unavailable', 503, 'EMAIL_AUTH_DISABLED');
      const webAuthn = getWebAuthnConfig(req);
      if (!isCanonicalAuthOrigin(req)) {
        res.status(409).json({
          success: false,
          code: 'CANONICAL_AUTH_REQUIRED',
          message: 'Continue sign-in on the canonical identity service.',
          canonicalOrigin: webAuthn.canonicalOrigin,
        });
        return;
      }
      const email = String(req.body?.email || '').trim().toLowerCase();
      if (!isValidEmail(email)) {
        res.status(400).json({ success: false, message: 'Enter a valid email address' });
        return;
      }
      if (!(await validateRecaptcha(req, String(req.body?.recaptchaResponse || '')))) {
        res.status(400).json({ success: false, message: 'Invalid captcha' });
        return;
      }
      const targetOrigin = await trustedTarget(req, req.body?.targetOrigin);
      const returnPath = safeRelativeReturnPath(req.body?.returnPath);
      const result = await createEmailAuthChallenge(req, {
        email,
        rememberMe: Boolean(req.body?.rememberMe),
        targetOrigin,
        returnPath,
      });
      const payload: Record<string, unknown> = {
        success: true,
        message: GENERIC_REQUEST_MESSAGE,
        challengeId: result.challengeId,
        retryAfterSeconds: result.retryAfterSeconds,
        expiresInSeconds: result.expiresInSeconds,
      };
      if (!result.deliveryRequired || !result.code || !result.linkToken) {
        res.status(202).json(payload);
        return;
      }

      const targetTenant = targetOrigin
        ? await getCivicTenantForHost(new URL(targetOrigin).hostname)
        : null;
      const appContext = req.app as unknown as AuthAppContext & {
        config?: AuthAppContext['config'] & { smtp?: { credentials?: { user?: string } } };
      };
      const projectName = String(targetTenant?.title || appContext.config?.projectName || 'Wikitruth');
      const signInUrl = new URL('/login', webAuthn.canonicalOrigin);
      signInUrl.searchParams.set('emailChallenge', result.challengeId);
      signInUrl.searchParams.set('emailToken', result.linkToken);
      const hasConfiguredDelivery = Boolean(appContext.config?.smtp?.credentials?.user);
      const emailSent = hasConfiguredDelivery
        ? await deliverEmail(req, res, {
            to: email,
            subject: `${result.code} is your ${projectName} sign-in code`,
            textPath: 'jade/login/email-code/email-text.jade',
            htmlPath: 'jade/login/email-code/email-html.jade',
            locals: {
              code: result.code,
              projectName,
              expiresMinutes: String(Math.max(1, Math.round(result.expiresInSeconds / 60))),
              signInLink: signInUrl.toString(),
            },
          })
        : false;
      await setEmailChallengeDelivery(result.challengeId, emailSent || process.env.NODE_ENV !== 'production');
      if (!emailSent && process.env.NODE_ENV === 'production') {
        res.status(502).json({ success: false, message: 'Unable to send a sign-in code right now' });
        return;
      }
      if (process.env.NODE_ENV !== 'production') {
        payload.debug = {
          code: result.code,
          signInLink: signInUrl.toString(),
          emailSent,
        };
      }
      res.status(202).json(payload);
    } catch (error) {
      try {
        errorResponse(res, error);
      } catch (unexpected) {
        next(unexpected);
      }
    }
  });

  router.post('/email-code/verify', async (req: WikitruthRequest, res: WikitruthResponse, next) => {
    try {
      if (!isCanonicalAuthOrigin(req)) {
        res.status(409).json({ success: false, message: 'Canonical authentication origin required' });
        return;
      }
      const result = await verifyEmailAuthChallenge(req, {
        challengeId: String(req.body?.challengeId || ''),
        code: String(req.body?.code || ''),
        linkToken: String(req.body?.linkToken || ''),
      });
      if (result.kind === 'new') {
        res.json({
          success: true,
          requiresUsername: true,
          challengeId: result.context.challengeId,
          completionToken: result.completionToken,
        });
        return;
      }
      res.json(await finishAuthentication(req, result.user, result.context, false));
    } catch (error) {
      try {
        errorResponse(res, error);
      } catch (unexpected) {
        next(unexpected);
      }
    }
  });

  router.post('/email-code/complete', async (req: WikitruthRequest, res: WikitruthResponse, next) => {
    try {
      if (!isCanonicalAuthOrigin(req)) {
        res.status(409).json({ success: false, message: 'Canonical authentication origin required' });
        return;
      }
      if (req.body?.agreeToTerms !== true) {
        res.status(400).json({
          success: false,
          code: 'TERMS_REQUIRED',
          message: 'Agree to the terms and responsible participation rules to create an account',
        });
        return;
      }
      const result = await completeEmailAuthSignup(req, {
        challengeId: String(req.body?.challengeId || ''),
        completionToken: String(req.body?.completionToken || ''),
        username: String(req.body?.username || '').trim(),
      });
      res.status(201).json(await finishAuthentication(req, result.user, result.context, true));
    } catch (error) {
      try {
        errorResponse(res, error);
      } catch (unexpected) {
        next(unexpected);
      }
    }
  });
}
