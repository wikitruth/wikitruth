'use strict';

const db = require('../../app').db.models;

function sanitizeUser(user) {
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

module.exports = function (router) {
  router.get('/me', async function (req, res) {
    if (!req.user) {
      return res.status(401).json({ success: false, user: null });
    }

    res.json({ success: true, user: sanitizeUser(req.user) });
  });

  router.post('/login', async function (req, res, next) {
    try {
      const username = String(req.body?.username || '').trim();
      const password = String(req.body?.password || '');

      if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
      }

      const user = await db.User.findOne({
        $or: [{ username: username }, { email: username }],
      });

      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const isValid = await db.User.validatePassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      req.login(user, function (err) {
        if (err) {
          return next(err);
        }

        res.json({ success: true, user: sanitizeUser(user) });
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout', function (req, res, next) {
    req.logout(function (err) {
      if (err) {
        return next(err);
      }

      req.session.destroy(function () {
        res.clearCookie('sid');
        res.json({ success: true });
      });
    });
  });

  router.post('/forgot-password', function (_req, res) {
    res.status(202).json({ success: true, message: 'Password reset workflow delegated to legacy account flow' });
  });

  router.post('/reset-password', function (_req, res) {
    res.status(202).json({ success: true, message: 'Password reset workflow delegated to legacy account flow' });
  });
};
