'use strict';

import type { Router } from 'express';
import type { WikitruthNext, WikitruthRequest, WikitruthResponse } from '../../types/http';

const crypto = require('crypto') as typeof import('crypto');

type AuthUserLike = {
  _id: string;
  username: string;
  email?: string;
  roles?: unknown;
};

type AuthUserDocument = {
  _id: string;
  id: string;
  username: string;
  email?: string;
  roles?: Record<string, unknown>;
  canPlayRoleOf?: (role: string) => boolean;
  defaultReturnUrl?: () => string;
  isAdmin?: () => boolean;
  password?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: number;
  save: () => Promise<AuthUserDocument>;
};

type AccountDocument = {
  _id: unknown;
};

type ModelsContract = {
  User: {
    findOne: (query: Record<string, unknown>) => Promise<AuthUserDocument | null>;
    create: (fields: Record<string, unknown>) => Promise<AuthUserDocument>;
    encryptPassword: (password: string, done: (err: unknown, hash?: string) => void) => void;
    validatePassword: (password: string, hash: string) => Promise<boolean>;
  };
  Account: {
    create: (fields: Record<string, unknown>) => Promise<AccountDocument>;
  };
};

const db = require('../../app').db.models as ModelsContract;

function sanitizeUser(user: AuthUserLike | null | undefined) {
  if (!user) {
    return null;
  }

  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    roles: user.roles,
  };
}

function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9\-_]+$/.test(username);
}

function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9\-_.+]+@[a-zA-Z0-9\-_.]+\.[a-zA-Z0-9\-_]+$/.test(email);
}

function encryptPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    db.User.encryptPassword(password, function (err, hash) {
      if (err) {
        reject(err);
        return;
      }

      if (!hash) {
        reject(new Error('Password hashing failed'));
        return;
      }

      resolve(hash);
    });
  });
}

function createResetToken(): string {
  return crypto.randomBytes(21).toString('hex');
}

module.exports = function (router: Router) {
  router.get('/me', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!req.user) {
      res.status(401).json({ success: false, user: null });
      return;
    }

    res.json({ success: true, user: sanitizeUser(req.user) });
  });

  router.post('/signup', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      const username = String(req.body?.username || '').trim();
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');

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
      });

      const requireAccountVerification = Boolean(
        (req.app as { config?: { requireAccountVerification?: boolean } }).config?.requireAccountVerification
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

      req.login(user as never, function (err?: unknown) {
        if (err) {
          return next(err);
        }

        res.status(201).json({ success: true, user: sanitizeUser(user) });
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/login', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      const username = String(req.body?.username || '').trim();
      const password = String(req.body?.password || '');

      if (!username || !password) {
        res.status(400).json({ success: false, message: 'Username and password are required' });
        return;
      }

      const user = await db.User.findOne({
        $or: [{ username: username }, { email: username.toLowerCase() }],
      });

      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      const isValid = await db.User.validatePassword(password, user.password || '');
      if (!isValid) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      req.login(user as never, function (err?: unknown) {
        if (err) {
          return next(err);
        }

        res.json({ success: true, user: sanitizeUser(user) });
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout', function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    req.logout(function (err?: unknown) {
      if (err) {
        return next(err);
      }

      req.session.destroy(function () {
        res.clearCookie('sid');
        res.json({ success: true });
      });
    });
  });

  router.post('/forgot-password', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
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

      const responsePayload: Record<string, unknown> = {
        success: true,
        message: 'If an account exists, reset instructions were generated.',
      };

      if (process.env.NODE_ENV !== 'production') {
        responsePayload.debug = {
          email: email,
          token: token,
        };
      }

      res.status(202).json(responsePayload);
    } catch (error) {
      next(error);
    }
  });

  router.post('/reset-password', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const token = String(req.body?.token || '').trim();
      const password = String(req.body?.password || '');

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
      user.resetPasswordToken = '';
      user.resetPasswordExpires = 0;
      await user.save();

      res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
      next(error);
    }
  });
};
