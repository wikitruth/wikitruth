import { randomUUID } from 'crypto';
import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import constants from '../../models/constants';
import appModForDb from '../../app';
import { logEntryEvent } from '../../services/entryEventsService';
import {
  activateEmailProvider,
  getEmailOperationsSettings,
  getStoredEmailProvider,
  listEmailProviders,
  readEmailProviderSecrets,
  removeEmailProvider,
  saveEmailOperationsSettings,
  saveEmailProvider,
  setEmailProviderEnabled,
  updateEmailProviderVerification,
  type EmailProviderSecrets,
  type SaveEmailProviderInput,
} from '../../services/emailProviderStore';
import {
  listEmailTemplates,
  renderEmailTemplate,
  SYNTHETIC_EMAIL_FIXTURE,
  type PublicEmailTemplateKey,
} from '../../services/emailCatalog';
import {
  listRecentEmailDeliveries,
  queueAndDeliverEmail,
  retryEmailDelivery,
} from '../../services/emailOutboxService';
import { resolveEmailProvider, sendEmailWithProvider } from '../../services/emailTransport';
import { getWebAuthnConfig } from '../../services/webAuthnConfigService';

type EnsureAdmin = (req: WikitruthRequest, res: WikitruthResponse) => boolean;

interface AccountQuery {
  lean: () => Promise<Record<string, unknown> | null>;
}

const db = (appModForDb as unknown as {
  db: { models: { Account: { findById: (id: unknown) => AccountQuery } } };
}).db.models;
const requestWindows = new Map<string, number[]>();

function actor(req: WikitruthRequest): { id: string; username: string } {
  return {
    id: String(req.user?._id || req.user?.id || ''),
    username: String(req.user?.username || ''),
  };
}

async function audit(req: WikitruthRequest, eventType: string, message: string, payload: Record<string, unknown>): Promise<void> {
  const current = actor(req);
  await logEntryEvent({
    scope: 'privileged',
    eventType,
    objectType: constants.OBJECT_TYPES.user as number,
    objectName: 'user',
    objectId: current.id,
    actorUserId: current.id,
    actorUsername: current.username,
    message,
    payload,
  });
}

function enforceRateLimit(req: WikitruthRequest, res: WikitruthResponse, action: string): boolean {
  const key = `${actor(req).id}:${action}`;
  const threshold = Date.now() - 60 * 60 * 1000;
  const recent = (requestWindows.get(key) || []).filter((timestamp) => timestamp > threshold);
  if (recent.length >= 5) {
    res.status(429).json({ success: false, message: 'Email test limit reached. Try again later.' });
    return false;
  }
  requestWindows.set(key, [...recent, Date.now()]);
  return true;
}

async function verifiedAdminEmail(req: WikitruthRequest): Promise<string> {
  const email = String(req.user?.email || '').trim().toLowerCase();
  const accountId = (req.user?.roles as Record<string, unknown> | undefined)?.account;
  if (!email || !accountId) throw new Error('A verified administrator email is required');
  const account = await db.Account.findById(accountId).lean();
  if (!account || account.isVerified !== 'yes') throw new Error('Verify your administrator email before sending tests');
  return email;
}

function templateKey(value: unknown): PublicEmailTemplateKey {
  const key = String(value || '') as PublicEmailTemplateKey;
  if (!listEmailTemplates().some((template) => template.key === key)) throw new Error('Email template not found');
  return key;
}

function providerInput(body: Record<string, unknown>, id?: string): SaveEmailProviderInput {
  const rawSecrets = (body.secrets && typeof body.secrets === 'object' ? body.secrets : {}) as Record<string, unknown>;
  const secrets: EmailProviderSecrets = {};
  ['apiKey', 'username', 'password', 'webhookSecret'].forEach((key) => {
    const value = String(rawSecrets[key] || '').trim();
    if (value) secrets[key as keyof EmailProviderSecrets] = value;
  });
  return {
    id,
    name: String(body.name || ''),
    type: body.type === 'smtp' ? 'smtp' : 'resend',
    enabled: body.enabled !== false,
    fromName: String(body.fromName || 'Wikitruth'),
    fromAddress: String(body.fromAddress || ''),
    host: String(body.host || ''),
    port: Number(body.port || 0),
    security: body.security === 'starttls' ? 'starttls' : 'ssl',
    secrets,
  };
}

function sendRouteError(res: WikitruthResponse, error: unknown, status = 400): void {
  res.status(status).json({ success: false, message: String((error as Error)?.message || error).slice(0, 500) });
}

export function registerAdminEmailOperationsRoutes(router: Router, ensureAdmin: EnsureAdmin): void {
  router.get('/email-operations', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res)) return;
    const effective = resolveEmailProvider();
    res.json({
      success: true,
      providers: listEmailProviders(),
      settings: getEmailOperationsSettings(),
      templates: listEmailTemplates(),
      deliveries: await listRecentEmailDeliveries(50),
      effectiveProvider: effective ? {
        configured: true,
        source: effective.source,
        id: effective.provider.id,
        name: effective.provider.name,
        type: effective.provider.type,
      } : { configured: false, source: 'none', id: '', name: '', type: '' },
    });
  });

  router.get('/email-operations/templates/:key/preview', (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res)) return;
    try {
      const key = templateKey(req.params.key);
      res.json({ success: true, key, synthetic: true, ...renderEmailTemplate(key, SYNTHETIC_EMAIL_FIXTURE) });
    } catch (error) {
      sendRouteError(res, error, 404);
    }
  });

  router.post('/email-operations/providers', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res)) return;
    try {
      const provider = saveEmailProvider(providerInput((req.body || {}) as Record<string, unknown>));
      await audit(req, 'admin.email.provider.created', 'Created an email provider', {
        providerId: provider.id, providerName: provider.name, providerType: provider.type,
      });
      res.status(201).json({ success: true, provider });
    } catch (error) {
      sendRouteError(res, error);
    }
  });

  router.put('/email-operations/providers/:id', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res)) return;
    try {
      const provider = saveEmailProvider(providerInput((req.body || {}) as Record<string, unknown>, String(req.params.id || '')));
      await audit(req, 'admin.email.provider.updated', 'Updated an email provider', {
        providerId: provider.id, providerName: provider.name, providerType: provider.type,
      });
      res.json({ success: true, provider });
    } catch (error) {
      sendRouteError(res, error);
    }
  });

  router.post('/email-operations/providers/:id/verify', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res) || !enforceRateLimit(req, res, 'verify')) return;
    const provider = getStoredEmailProvider(String(req.params.id || ''));
    if (!provider) {
      res.status(404).json({ success: false, message: 'Email provider not found' });
      return;
    }
    let recipient = '';
    try {
      recipient = await verifiedAdminEmail(req);
      const rendered = renderEmailTemplate('provider_verification', {
        projectName: 'Wikitruth', recipientName: actor(req).username,
      });
      await sendEmailWithProvider(provider, readEmailProviderSecrets(provider), { to: recipient, ...rendered });
      const updated = updateEmailProviderVerification(provider.id, { verified: true, recipient });
      await audit(req, 'admin.email.provider.verified', 'Verified an email provider', {
        providerId: provider.id, providerName: provider.name, providerType: provider.type,
      });
      res.json({ success: true, provider: updated });
    } catch (error) {
      updateEmailProviderVerification(provider.id, { verified: false, recipient, error: String((error as Error)?.message || error) });
      sendRouteError(res, error, 502);
    }
  });

  router.post('/email-operations/providers/:id/activate', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res)) return;
    try {
      const provider = activateEmailProvider(String(req.params.id || ''));
      await audit(req, 'admin.email.provider.activated', 'Activated an email provider', {
        providerId: provider.id, providerName: provider.name, providerType: provider.type,
      });
      res.json({ success: true, provider });
    } catch (error) {
      sendRouteError(res, error);
    }
  });

  router.post('/email-operations/providers/:id/enabled', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res)) return;
    try {
      const provider = setEmailProviderEnabled(String(req.params.id || ''), req.body?.enabled === true);
      await audit(req, 'admin.email.provider.enabled', 'Changed email provider availability', {
        providerId: provider.id, enabled: provider.enabled,
      });
      res.json({ success: true, provider });
    } catch (error) {
      sendRouteError(res, error);
    }
  });

  router.delete('/email-operations/providers/:id', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res)) return;
    try {
      const providerId = String(req.params.id || '');
      const provider = getStoredEmailProvider(providerId);
      removeEmailProvider(providerId);
      await audit(req, 'admin.email.provider.removed', 'Removed an email provider', {
        providerId, providerName: provider?.name || '', providerType: provider?.type || '',
      });
      res.json({ success: true });
    } catch (error) {
      sendRouteError(res, error);
    }
  });

  router.put('/email-operations/settings', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res)) return;
    try {
      const settings = saveEmailOperationsSettings({ contactRecipient: String(req.body?.contactRecipient || '') });
      await audit(req, 'admin.email.settings.updated', 'Updated email operations settings', {
        contactRecipientConfigured: Boolean(settings.contactRecipient),
      });
      res.json({ success: true, settings });
    } catch (error) {
      sendRouteError(res, error);
    }
  });

  router.post('/email-operations/test', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res) || !enforceRateLimit(req, res, 'test')) return;
    try {
      const recipient = await verifiedAdminEmail(req);
      const key = templateKey(req.body?.templateKey);
      const origin = getWebAuthnConfig(req).canonicalOrigin;
      await queueAndDeliverEmail({
        templateKey: key,
        to: recipient,
        locals: { ...SYNTHETIC_EMAIL_FIXTURE, actionUrl: `${origin}/explore` },
        idempotencyKey: `admin-test:${actor(req).id}:${key}:${randomUUID()}`,
        test: true,
        actorUserId: actor(req).id,
        maxAttempts: 1,
      });
      await audit(req, 'admin.email.test.sent', 'Sent an email template test', { templateKey: key });
      res.status(202).json({ success: true, recipientMasked: recipient.replace(/^(.).*(@.*)$/, '$1***$2') });
    } catch (error) {
      sendRouteError(res, error, 502);
    }
  });

  router.post('/email-operations/deliveries/:id/retry', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res) || !enforceRateLimit(req, res, 'retry')) return;
    try {
      const deliveryId = String(req.params.id || '');
      if (!(await retryEmailDelivery(deliveryId))) {
        res.status(409).json({ success: false, message: 'This delivery is not eligible for retry' });
        return;
      }
      await audit(req, 'admin.email.delivery.retried', 'Retried a failed email delivery', { deliveryId });
      res.status(202).json({ success: true });
    } catch (error) {
      sendRouteError(res, error);
    }
  });
}
