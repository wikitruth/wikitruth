'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';

import * as httpClient from '../../utils/httpClient';

type ContactBody = {
  name?: unknown;
  email?: unknown;
  message?: unknown;
  recaptchaResponse?: unknown;
};

type ContactAppContext = {
  config?: {
    grecaptcha?: {
      secret?: string;
    };
    smtp?: {
      from?: {
        name?: string;
        address?: string;
      };
    };
    systemEmail?: string;
    projectName?: string;
  };
  utility?: {
    sendmail: (
      req: WikitruthRequest,
      res: WikitruthResponse,
      options: {
        from: string;
        replyTo: string;
        to: string;
        subject: string;
        textPath: string;
        htmlPath: string;
        locals: Record<string, string>;
        success: () => void;
        error: (err: unknown) => void;
      }
    ) => void;
  };
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function validateRecaptcha(req: WikitruthRequest, token: string): Promise<boolean> {
  const appCtx = req.app as unknown as ContactAppContext;
  const secret = String(appCtx.config?.grecaptcha?.secret || '').trim();
  if (!secret) {
    return true;
  }
  if (!token) {
    return false;
  }

  try {
    const captchaResult = await httpClient.postForm<{ success?: boolean }>('https://www.google.com/recaptcha/api/siteverify', {
      secret: secret,
      response: token,
    });

    return Boolean(captchaResult.statusCode === 200 && captchaResult.body?.success);
  } catch (_error) {
    return false;
  }
}

export = function (router: Router) {
  router.post('/', async function (req: WikitruthRequest, res: WikitruthResponse): Promise<void> {
    const body = (req.body || {}) as ContactBody;
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    const message = String(body.message || '').trim();
    const recaptchaResponse = String(body.recaptchaResponse || '').trim();

    if (name.length < 2) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'A valid email is required' });
      return;
    }
    if (message.length < 10) {
      res.status(400).json({ error: 'Message must be at least 10 characters' });
      return;
    }

    const captchaValid = await validateRecaptcha(req, recaptchaResponse);
    if (!captchaValid) {
      res.status(400).json({ error: 'Invalid captcha' });
      return;
    }

    const appCtx = req.app as unknown as ContactAppContext;
    const fromName = String(appCtx.config?.smtp?.from?.name || '').trim();
    const fromAddress = String(appCtx.config?.smtp?.from?.address || '').trim();
    const systemEmail = String(appCtx.config?.systemEmail || '').trim();
    const projectName = String(appCtx.config?.projectName || '').trim();
    const sendmail = appCtx.utility?.sendmail;

    if (!sendmail) {
      throw new Error('Mail utility is not configured');
    }

    await new Promise<void>(function (resolve, reject) {
      sendmail(req, res, {
        from: `${fromName} <${fromAddress}>`,
        replyTo: email,
        to: systemEmail,
        subject: `${projectName} contact form`,
        textPath: 'jade/contact/email-text.jade',
        htmlPath: 'jade/contact/email-html.jade',
        locals: {
          name: name,
          email: email,
          message: message,
          projectName: projectName,
        },
        success: function () {
          resolve();
        },
        error: function (err: unknown) {
          reject(err);
        },
      });
    });

    res.status(200).json({
      success: true,
      message: 'We have received your message. Thank you.',
    });
  });
};
