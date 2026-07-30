'use strict';

import type { Router } from 'express';
import type { WikitruthNext, WikitruthRequest, WikitruthResponse } from '../../types/http';
import {
  bodyOf,
  type AccountSettingsContactBodyContract,
  type AccountSettingsIdentityBodyContract,
  type AccountSettingsPasswordBodyContract,
  type FastSwitchBodyContract,
  type ForgotPasswordBodyContract,
  type LoginBodyContract,
  type RefreshTokenBodyContract,
  type ResetPasswordBodyContract,
  type RoleSwitchBodyContract,
  type SignupBodyContract,
  type VerificationConfirmBodyContract,
  type VerificationResendBodyContract,
} from '../../types/controllerContracts';
import jwtMod from 'jsonwebtoken';
import {
  db,
  sanitizeUser,
  normalizeActiveRole,
  getSessionActiveRole,
  getDefaultActiveRole,
  setSessionActiveRole,
  validateRecaptcha,
  isValidUsername,
  isValidEmail,
  encryptPassword,
  parseFastSwitchCookies,
  getOauthProviders,
  getSocialConnections,
  isLoginAttemptBlocked,
  recordFailedLoginAttempt,
  getAccountIdFromUser,
  buildAbsoluteUrl,
  deliverEmail,
  type AuthAppContext,
  type AuthUserDocument,
} from './authHelpers';
import {
  createResetToken,
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
} from './authTokenHelpers';
import { registerAuthOnboardingRoutes } from './authOnboardingRoutes';
import { registerAuthPasskeyRoutes } from './authPasskeyRoutes';
import { registerAuthSessionRoutes } from './authSessionRoutes';
import { registerAuthEmailCodeRoutes } from './authEmailCodeRoutes';
import {
  establishAuthenticatedSession,
  getAuthenticationAssurance,
  saveSession,
} from '../../services/authAssuranceService';
import {
  revokeAllWebSessions,
  revokeCurrentWebSession,
  revokeOtherWebSessions,
} from '../../services/webSessionService';

const jwt = jwtMod as unknown as typeof import('jsonwebtoken');

export = function (router: Router) {
  registerAuthOnboardingRoutes(router);
  registerAuthPasskeyRoutes(router);
  registerAuthSessionRoutes(router);
  registerAuthEmailCodeRoutes(router);
  router.get('/me', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!req.user) {
      // Keep this endpoint non-failing for anonymous page loads in modern UI.
      res.json({ success: false, user: null, activeRole: 'reader' });
      return;
    }

    const activeRole = getSessionActiveRole(req) || getDefaultActiveRole(req.user as unknown as AuthUserDocument);
    setSessionActiveRole(req, activeRole);
    res.json({
      success: true,
      user: sanitizeUser(req.user),
      activeRole: activeRole,
      assurance: getAuthenticationAssurance(req),
    });
  });

  router.get('/providers', async function (req: WikitruthRequest, res: WikitruthResponse) {
    res.json({
      success: true,
      providers: getOauthProviders(req),
    });
  });

  router.post('/signup', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      const body = bodyOf<SignupBodyContract>(req);
      const username = String(body.username || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const recaptchaResponse = String(body.recaptchaResponse || '').trim();

      if (!username || !email || !password) {
        res.status(400).json({ success: false, message: 'Username, email, and password are required' });
        return;
      }

      if (!isValidUsername(username)) {
        res.status(400).json({ success: false, message: 'Invalid username format' });
        return;
      }

      if (!isValidEmail(email)) {
        res.status(400).json({ success: false, message: 'Invalid email format' });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        return;
      }

      const captchaValid = await validateRecaptcha(req, recaptchaResponse);
      if (!captchaValid) {
        res.status(400).json({ success: false, message: 'Invalid captcha' });
        return;
      }

      const usernameTaken = await db.User.findOne({ username: username });
      if (usernameTaken) {
        res.status(409).json({ success: false, message: 'Username already taken' });
        return;
      }

      const emailTaken = await db.User.findOne({ email: email });
      if (emailTaken) {
        res.status(409).json({ success: false, message: 'Email already registered' });
        return;
      }

      const passwordHash = await encryptPassword(password);
      const user = await db.User.create({
        isActive: 'yes',
        username: username,
        email: email,
        password: passwordHash,
        search: [username, email],
        onboarding: {
          contributor: { completed: false },
          reviewer: { completed: false },
        },
      });

      const requireAccountVerification = Boolean(
        (req.app as unknown as AuthAppContext).config?.requireAccountVerification
      );

      const account = await db.Account.create({
        isVerified: requireAccountVerification ? 'no' : 'yes',
        'name.full': user.username,
        user: {
          id: user._id,
          name: user.username,
        },
        search: [user.username],
      });

      if (!user.roles) {
        user.roles = {};
      }
      user.roles.account = account._id;
      await user.save();

      await establishAuthenticatedSession(req, user, 'password', {
        rememberMe: Boolean(body.rememberMe),
      });
      setSessionActiveRole(req, 'reader');
      await saveSession(req);
      res.status(201).json({ success: true, user: sanitizeUser(user), activeRole: 'reader' });
    } catch (error) {
      next(error);
    }
  });

  router.post('/login', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      const body = bodyOf<LoginBodyContract>(req);
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      const normalizedLoginIdentity = username.toLowerCase();

      if (!username || !password) {
        res.status(400).json({ success: false, message: 'Username and password are required' });
        return;
      }

      if (await isLoginAttemptBlocked(req, normalizedLoginIdentity)) {
        res.status(429).json({
          success: false,
          message: 'Too many login attempts. Please try again later.',
        });
        return;
      }

      const user = await db.User.findOne({
        $or: [{ username: username }, { email: username.toLowerCase() }],
      });

      if (!user) {
        await recordFailedLoginAttempt(req, normalizedLoginIdentity);
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      if (user.passwordLoginDisabled) {
        res.status(403).json({ success: false, message: 'Password sign-in is disabled. Use an email code, passkey, or recovery code.' });
        return;
      }

      const isValid = await db.User.validatePassword(password, user.password || '');
      if (!isValid) {
        await recordFailedLoginAttempt(req, normalizedLoginIdentity);
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      await establishAuthenticatedSession(req, user, 'password', {
        rememberMe: Boolean(body.rememberMe),
      });
      const activeRole = getSessionActiveRole(req) || getDefaultActiveRole(user);
      setSessionActiveRole(req, activeRole);
      await saveSession(req);
      res.json({ success: true, user: sanitizeUser(user), activeRole: activeRole });
    } catch (error) {
      next(error);
    }
  });

  router.post('/role-switch', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const body = bodyOf<RoleSwitchBodyContract>(req);
    const requestedRole = String(body.role || '').trim().toLowerCase();
    const role = normalizeActiveRole(requestedRole, req.user as unknown as AuthUserDocument);
    if (!role) {
      res.status(400).json({ success: false, message: 'Invalid role switch request' });
      return;
    }

    setSessionActiveRole(req, role);
    res.json({ success: true, activeRole: role });
  });

  router.post('/fast-switch', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      const body = bodyOf<FastSwitchBodyContract>(req);
      const pin = String(body.pin || '').trim();
      if (!/^\d{6}$/.test(pin)) {
        res.status(400).json({ success: false, message: 'PIN must be 6 digits' });
        return;
      }

      const fastSwitchCookies = parseFastSwitchCookies(req.cookies?.fast_switch);
      if (fastSwitchCookies.length === 0) {
        res.status(401).json({ success: false, message: 'No fast-switch session found' });
        return;
      }

      const secret = `${pin}|${String((req.app as unknown as AuthAppContext).config?.jwtSecret || '')}`;
      let matchedUserId = '';

      for (const cookie of fastSwitchCookies) {
        if (!cookie?.data) {
          continue;
        }

        try {
          const decoded = jwt.verify(cookie.data, secret) as { userId?: string };
          if (decoded?.userId) {
            matchedUserId = String(decoded.userId);
            break;
          }
        } catch (_err) {
          // Keep checking other trusted-client records.
        }
      }

      if (!matchedUserId) {
        res.status(401).json({ success: false, message: 'Invalid PIN' });
        return;
      }

      const user = await db.User.findById(matchedUserId);
      if (!user) {
        res.status(401).json({ success: false, message: 'Account not found' });
        return;
      }

      await establishAuthenticatedSession(req, user, 'fast_switch', {
        rememberMe: Boolean(body.rememberMe),
      });
      const activeRole = getSessionActiveRole(req) || getDefaultActiveRole(user);
      setSessionActiveRole(req, activeRole);
      await saveSession(req);
      res.json({ success: true, user: sanitizeUser(user), activeRole: activeRole });
    } catch (error) {
      next(error);
    }
  });

  router.get('/account-settings', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const user = await db.User.findById(req.user._id || req.user.id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      const accountId = getAccountIdFromUser(user);
      const account = accountId ? await db.Account.findById(accountId) : null;

      res.json({
        success: true,
        account: {
          first: account?.name?.first || '',
          middle: account?.name?.middle || '',
          last: account?.name?.last || '',
          company: account?.company || '',
          phone: account?.phone || '',
          zip: account?.zip || '',
        },
        identity: {
          username: user.username || '',
          email: user.email || '',
        },
        providers: getOauthProviders(req),
        social: getSocialConnections(user),
      });
    } catch (error) {
      next(error);
    }
  });

  router.put('/account-settings/contact', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const body = bodyOf<AccountSettingsContactBodyContract>(req);
      const first = String(body.first || '').trim();
      const middle = String(body.middle || '').trim();
      const last = String(body.last || '').trim();
      const company = String(body.company || '').trim();
      const phone = String(body.phone || '').trim();
      const zip = String(body.zip || '').trim();

      if (!first) {
        res.status(400).json({ success: false, message: 'First name is required' });
        return;
      }
      if (!last) {
        res.status(400).json({ success: false, message: 'Last name is required' });
        return;
      }

      const accountId = getAccountIdFromUser(req.user);
      if (!accountId) {
        res.status(404).json({ success: false, message: 'Account role not found' });
        return;
      }

      const updated = await db.Account.findByIdAndUpdate(
        accountId,
        {
          name: {
            first: first,
            middle: middle,
            last: last,
            full: `${first} ${last}`.trim(),
          },
          company: company,
          phone: phone,
          zip: zip,
          search: [first, middle, last, company, phone, zip],
        },
        { new: true },
      );

      if (!updated) {
        res.status(404).json({ success: false, message: 'Account not found' });
        return;
      }

      res.json({
        success: true,
        account: {
          first: updated.name?.first || '',
          middle: updated.name?.middle || '',
          last: updated.name?.last || '',
          company: updated.company || '',
          phone: updated.phone || '',
          zip: updated.zip || '',
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.put('/account-settings/identity', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const body = bodyOf<AccountSettingsIdentityBodyContract>(req);
      const username = String(body.username || '').trim();
      const email = String(body.email || '').trim().toLowerCase();

      if (!username) {
        res.status(400).json({ success: false, message: 'Username is required' });
        return;
      }
      if (!isValidUsername(username)) {
        res.status(400).json({ success: false, message: 'Invalid username format' });
        return;
      }
      if (!email || !isValidEmail(email)) {
        res.status(400).json({ success: false, message: 'Invalid email format' });
        return;
      }

      const duplicateUsername = await db.User.findOne({ username: username, _id: { $ne: req.user._id || req.user.id } });
      if (duplicateUsername) {
        res.status(409).json({ success: false, message: 'Username already taken' });
        return;
      }

      const duplicateEmail = await db.User.findOne({ email: email, _id: { $ne: req.user._id || req.user.id } });
      if (duplicateEmail) {
        res.status(409).json({ success: false, message: 'Email already taken' });
        return;
      }

      const user = await db.User.findById(req.user._id || req.user.id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      user.username = username;
      user.email = email;
      user.search = [username, email];
      await user.save();

      if (user.roles?.admin && db.Admin?.findByIdAndUpdate) {
        await db.Admin.findByIdAndUpdate(user.roles.admin, {
          user: {
            id: user._id,
            name: user.username,
          },
        });
      }

      if (user.roles?.account) {
        await db.Account.findByIdAndUpdate(user.roles.account, {
          user: {
            id: user._id,
            name: user.username,
          },
        });
      }

      req.user.username = user.username;
      req.user.email = user.email;

      res.json({
        success: true,
        identity: {
          username: user.username,
          email: user.email,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.put('/account-settings/password', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const body = bodyOf<AccountSettingsPasswordBodyContract>(req);
      const newPassword = String(body.newPassword || '');
      const confirm = String(body.confirm || '');
      if (!newPassword) {
        res.status(400).json({ success: false, message: 'New password is required' });
        return;
      }
      if (!confirm) {
        res.status(400).json({ success: false, message: 'Password confirmation is required' });
        return;
      }
      if (newPassword !== confirm) {
        res.status(400).json({ success: false, message: 'Passwords do not match' });
        return;
      }
      if (newPassword.length < 6) {
        res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        return;
      }

      const user = await db.User.findById(req.user._id || req.user.id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      user.password = await encryptPassword(newPassword);
      user.passwordLoginDisabled = false;
      await user.save();
      await revokeOtherWebSessions(
        req,
        String(req.user._id || req.user.id || ''),
        'password_changed'
      );

      res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
      next(error);
    }
  });

  router.post('/token', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      let user: AuthUserDocument | null = null;
      const body = bodyOf<LoginBodyContract>(req);
      const username = String(body.username || '').trim();
      const password = String(body.password || '');

      if (username && password) {
        user = await db.User.findOne({
          $or: [{ username: username }, { email: username.toLowerCase() }],
        });

        if (!user) {
          res.status(401).json({ success: false, message: 'Invalid credentials' });
          return;
        }

        if (user.passwordLoginDisabled) {
          res.status(403).json({ success: false, message: 'Password token issuance is disabled for this account' });
          return;
        }

        const validPassword = await db.User.validatePassword(password, user.password || '');
        if (!validPassword) {
          res.status(401).json({ success: false, message: 'Invalid credentials' });
          return;
        }
      } else if (req.user) {
        user = await db.User.findById(req.user._id || req.user.id);
      }

      if (!user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const issued = issueTokenPair(req, user);
      await user.save();

      res.status(201).json({
        success: true,
        tokenType: 'Bearer',
        accessToken: issued.accessToken,
        refreshToken: issued.refreshToken,
        accessTokenExpiresIn: issued.accessTokenExpiresIn,
        refreshTokenExpiresIn: issued.refreshTokenExpiresIn,
        user: sanitizeUser(user),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/token/refresh', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      const body = bodyOf<RefreshTokenBodyContract>(req);
      const refreshToken = String(body.refreshToken || '').trim();
      if (!refreshToken) {
        res.status(400).json({ success: false, message: 'refreshToken is required' });
        return;
      }

      const rotated = await rotateRefreshToken(req, refreshToken);
      if (!rotated) {
        res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
        return;
      }

      res.json({
        success: true,
        tokenType: 'Bearer',
        accessToken: rotated.accessToken,
        refreshToken: rotated.nextRefreshToken,
        accessTokenExpiresIn: rotated.accessTokenExpiresIn,
        refreshTokenExpiresIn: rotated.refreshTokenExpiresIn,
        user: sanitizeUser(rotated.user),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/token/revoke', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      const body = bodyOf<RefreshTokenBodyContract>(req);
      const refreshToken = String(body.refreshToken || '').trim();
      if (!refreshToken) {
        res.status(400).json({ success: false, message: 'refreshToken is required' });
        return;
      }

      const revoked = await revokeRefreshToken(req, refreshToken);
      if (!revoked) {
        res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
        return;
      }

      res.json({ success: true, message: 'Refresh token revoked' });
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    await revokeCurrentWebSession(req, 'signed_out');
    req.logout(function (err?: unknown) {
      if (err) {
        return next(err);
      }

      req.session.destroy(function () {
        const sessionName = String(
          (req.app as unknown as { config?: { session?: { name?: string } } }).config?.session?.name || 'sid'
        );
        res.clearCookie(sessionName);
        res.json({ success: true });
      });
    });
  });

  router.post('/forgot-password', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      const body = bodyOf<ForgotPasswordBodyContract>(req);
      const email = String(body.email || '').trim().toLowerCase();
      if (!email || !isValidEmail(email)) {
        res.status(400).json({ success: false, message: 'A valid email is required' });
        return;
      }

      const user = await db.User.findOne({ email: email });
      if (!user) {
        res.status(202).json({ success: true, message: 'If an account exists, reset instructions were generated.' });
        return;
      }

      const token = createResetToken();
      user.resetPasswordToken = await encryptPassword(token);
      user.resetPasswordExpires = Date.now() + 10000000;
      await user.save();

      const appCtx = req.app as unknown as AuthAppContext;
      const projectName = String(appCtx.config?.projectName || 'Wikitruth').trim();
      const resetLink = buildAbsoluteUrl(
        req,
        `/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`
      );
      const emailSent = await deliverEmail(req, res, {
        to: user.email || email,
        subject: `Reset your ${projectName} password`,
        textPath: 'jade/login/forgot/email-text.jade',
        htmlPath: 'jade/login/forgot/email-html.jade',
        locals: {
          username: user.username || email,
          resetLink: resetLink,
          projectName: projectName,
        },
      });

      const responsePayload: Record<string, unknown> = {
        success: true,
        message: 'If an account exists, reset instructions were sent.',
      };

      if (process.env.NODE_ENV !== 'production') {
        responsePayload.debug = {
          email: email,
          token: token,
          resetLink: resetLink,
          emailSent: emailSent,
        };
      }

      res.status(202).json(responsePayload);
    } catch (error) {
      next(error);
    }
  });

  router.post('/reset-password', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      const body = bodyOf<ResetPasswordBodyContract>(req);
      const email = String(body.email || '').trim().toLowerCase();
      const token = String(body.token || '').trim();
      const password = String(body.password || '');

      if (!email || !token || !password) {
        res.status(400).json({ success: false, message: 'Email, token, and password are required' });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        return;
      }

      const user = await db.User.findOne({
        email: email,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user || !user.resetPasswordToken) {
        res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        return;
      }

      const isValidToken = await db.User.validatePassword(token, user.resetPasswordToken);
      if (!isValidToken) {
        res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        return;
      }

      user.password = await encryptPassword(password);
      user.passwordLoginDisabled = false;
      user.resetPasswordToken = '';
      user.resetPasswordExpires = 0;
      await user.save();
      await revokeAllWebSessions(req, String(user._id || user.id || ''), 'password_reset');

      res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
      next(error);
    }
  });

  router.get('/verification-status', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const accountId = getAccountIdFromUser(req.user);
      if (!accountId) {
        res.status(404).json({ success: false, message: 'Account role not found' });
        return;
      }

      const account = await db.Account.findById(accountId);
      if (!account) {
        res.status(404).json({ success: false, message: 'Account not found' });
        return;
      }

      const requireAccountVerification = Boolean(
        (req.app as unknown as AuthAppContext).config?.requireAccountVerification
      );

      res.json({
        success: true,
        verification: {
          required: requireAccountVerification,
          isVerified: account.isVerified === 'yes',
          email: req.user.email || '',
          hasPendingToken: Boolean(account.verificationToken),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/verification-resend', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const accountId = getAccountIdFromUser(req.user);
      if (!accountId) {
        res.status(404).json({ success: false, message: 'Account role not found' });
        return;
      }

      const account = await db.Account.findById(accountId);
      if (!account) {
        res.status(404).json({ success: false, message: 'Account not found' });
        return;
      }

      const body = bodyOf<VerificationResendBodyContract>(req);
      const nextEmail = String(body.email || req.user.email || '').trim().toLowerCase();
      if (!nextEmail || !isValidEmail(nextEmail)) {
        res.status(400).json({ success: false, message: 'A valid email is required' });
        return;
      }

      if (nextEmail !== String(req.user.email || '').toLowerCase()) {
        const duplicate = await db.User.findOne({
          email: nextEmail,
          _id: { $ne: req.user._id },
        });
        if (duplicate) {
          res.status(409).json({ success: false, message: 'Email is already in use' });
          return;
        }

        const user = await db.User.findById(req.user._id || req.user.id);
        if (!user) {
          res.status(404).json({ success: false, message: 'User not found' });
          return;
        }
        user.email = nextEmail;
        await user.save();
        req.user.email = nextEmail;
      }

      const token = createResetToken();
      account.verificationToken = await encryptPassword(token);
      account.isVerified = 'no';
      await account.save();

      const appCtx = req.app as unknown as AuthAppContext;
      const projectName = String(appCtx.config?.projectName || 'Wikitruth').trim();
      const verifyUrl = buildAbsoluteUrl(
        req,
        `/account/verification?token=${encodeURIComponent(token)}`
      );
      const emailSent = await deliverEmail(req, res, {
        to: req.user.email || nextEmail,
        subject: `Verify Your ${projectName} Account`,
        textPath: 'jade/account/verification/email-text.jade',
        htmlPath: 'jade/account/verification/email-html.jade',
        locals: {
          verifyURL: verifyUrl,
          projectName: projectName,
        },
      });

      const payload: Record<string, unknown> = {
        success: true,
        message: emailSent ? 'Verification email sent' : 'Verification token generated',
      };

      if (process.env.NODE_ENV !== 'production') {
        payload.debug = {
          email: req.user.email || '',
          token: token,
          verifyUrl: verifyUrl,
          emailSent: emailSent,
        };
      }

      if (!emailSent && process.env.NODE_ENV === 'production') {
        res.status(502).json({ success: false, message: 'Unable to send verification email right now' });
        return;
      }

      res.status(202).json(payload);
    } catch (error) {
      next(error);
    }
  });

  router.post('/verification-confirm', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const accountId = getAccountIdFromUser(req.user);
      if (!accountId) {
        res.status(404).json({ success: false, message: 'Account role not found' });
        return;
      }

      const account = await db.Account.findById(accountId);
      if (!account) {
        res.status(404).json({ success: false, message: 'Account not found' });
        return;
      }

      if (account.isVerified === 'yes') {
        res.json({ success: true, message: 'Account already verified' });
        return;
      }

      const body = bodyOf<VerificationConfirmBodyContract>(req);
      const token = String(body.token || '').trim();
      if (!token) {
        res.status(400).json({ success: false, message: 'Verification token is required' });
        return;
      }

      if (!account.verificationToken) {
        res.status(400).json({ success: false, message: 'No verification token is pending' });
        return;
      }

      const valid = await db.User.validatePassword(token, account.verificationToken);
      if (!valid) {
        res.status(400).json({ success: false, message: 'Invalid verification token' });
        return;
      }

      account.isVerified = 'yes';
      account.verificationToken = '';
      await account.save();

      const reqUserRoles = (req.user.roles || {}) as Record<string, unknown>;
      const accountRole = reqUserRoles.account as { isVerified?: string; verificationToken?: string } | undefined;
      if (accountRole && typeof accountRole === 'object') {
        accountRole.isVerified = 'yes';
        accountRole.verificationToken = '';
      }

      res.json({ success: true, message: 'Account verified successfully' });
    } catch (error) {
      next(error);
    }
  });
};
