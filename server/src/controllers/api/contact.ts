'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';

import * as httpClient from '../../utils/httpClient';
import { getEmailOperationsSettings } from '../../services/emailProviderStore';
import { queueEmail } from '../../services/emailOutboxService';

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
    systemEmail?: string;
    projectName?: string;
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
    const settings = getEmailOperationsSettings();
    const systemEmail = String(settings.contactRecipient || appCtx.config?.systemEmail || '').trim();
    const projectName = String(appCtx.config?.projectName || 'Wikitruth').trim();
    if (!systemEmail) {
      res.status(503).json({ error: 'Contact delivery is not configured' });
      return;
    }
    await queueEmail({
      templateKey: 'contact_form',
      to: systemEmail,
      replyTo: email,
      locals: { senderName: name, senderEmail: email, message, projectName },
      idempotencyKey: `contact:${Date.now()}:${String(req.ip || '')}:${email}`,
      maxAttempts: 4,
    });

    res.status(202).json({
      success: true,
      message: 'We have received your message. Thank you.',
    });
  });
};
