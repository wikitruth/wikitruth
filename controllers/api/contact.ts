'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';

const httpClient = require('../../utils/httpClient') as {
  postForm: (
    url: string,
    formData: Record<string, string>,
  ) => Promise<{ statusCode: number; body?: { success?: boolean } }>;
};

type ContactBody = {
  name?: unknown;
  email?: unknown;
  message?: unknown;
  recaptchaResponse?: unknown;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function validateRecaptcha(req: WikitruthRequest, token: string): Promise<boolean> {
  const secret = String(req.app.config?.grecaptcha?.secret || '').trim();
  if (!secret || !token) {
    return true;
  }

  try {
    const captchaResult = await httpClient.postForm('https://www.google.com/recaptcha/api/siteverify', {
      secret: secret,
      response: token,
    });

    return Boolean(captchaResult.statusCode === 200 && captchaResult.body?.success);
  } catch (_error) {
    return false;
  }
}

module.exports = function (router: Router) {
  router.post('/', async function (req: WikitruthRequest, res: WikitruthResponse) {
    const body = (req.body || {}) as ContactBody;
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    const message = String(body.message || '').trim();
    const recaptchaResponse = String(body.recaptchaResponse || '').trim();

    if (name.length < 2) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }
    if (message.length < 10) {
      return res.status(400).json({ error: 'Message must be at least 10 characters' });
    }

    const captchaValid = await validateRecaptcha(req, recaptchaResponse);
    if (!captchaValid) {
      return res.status(400).json({ error: 'Invalid captcha' });
    }

    await new Promise<void>(function (resolve, reject) {
      req.app.utility.sendmail(req, res, {
        from: `${req.app.config.smtp.from.name} <${req.app.config.smtp.from.address}>`,
        replyTo: email,
        to: req.app.config.systemEmail,
        subject: `${req.app.config.projectName} contact form`,
        textPath: 'jade/contact/email-text.jade',
        htmlPath: 'jade/contact/email-html.jade',
        locals: {
          name: name,
          email: email,
          message: message,
          projectName: req.app.config.projectName,
        },
        success: function () {
          resolve();
        },
        error: function (err: unknown) {
          reject(err);
        },
      });
    });

    return res.status(200).json({
      success: true,
      message: 'We have received your message. Thank you.',
    });
  });
};
