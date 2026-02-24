'use strict';

import type { Router } from 'express';
import type { AuthUser } from '../../types/auth';
import type { WikitruthNext, WikitruthRequest, WikitruthResponse } from '../../types/http';

const db = require('../../app').db.models;

function sanitizeUser(user: AuthUser | null | undefined) {
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

module.exports = function (router: Router) {
  router.get('/me', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!req.user) {
      res.status(401).json({ success: false, user: null });
      return;
    }

    res.json({ success: true, user: sanitizeUser(req.user) });
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
        $or: [{ username: username }, { email: username }],
      });

      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      const isValid = await db.User.validatePassword(password, user.password);
      if (!isValid) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      req.login(user, function (err?: unknown) {
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

  router.post('/forgot-password', function (_req: WikitruthRequest, res: WikitruthResponse) {
    res.status(202).json({ success: true, message: 'Password reset workflow delegated to legacy account flow' });
  });

  router.post('/reset-password', function (_req: WikitruthRequest, res: WikitruthResponse) {
    res.status(202).json({ success: true, message: 'Password reset workflow delegated to legacy account flow' });
  });
};
