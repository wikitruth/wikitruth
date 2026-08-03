import { createHmac, timingSafeEqual } from 'crypto';
import type { Request, Response } from 'express';
import { applyProviderEvent } from '../../services/emailOutboxService';
import { listStoredEmailProviders, readEmailProviderSecrets } from '../../services/emailProviderStore';

const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

function signatureValues(header: string): string[] {
  return header.split(/\s+/).map((item) => item.trim()).filter(Boolean).flatMap((item) => {
    const [version, value] = item.split(',');
    return version === 'v1' && value ? [value] : [];
  });
}

function verifySignature(raw: Buffer, headers: Request['headers'], secret: string): boolean {
  const messageId = String(headers['svix-id'] || '');
  const timestamp = String(headers['svix-timestamp'] || '');
  const signatures = signatureValues(String(headers['svix-signature'] || ''));
  if (!messageId || !timestamp || !signatures.length) return false;
  const unixSeconds = Number(timestamp);
  if (!Number.isFinite(unixSeconds) || Math.abs(Date.now() / 1000 - unixSeconds) > MAX_CLOCK_SKEW_SECONDS) return false;
  const keyValue = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  let key: Buffer;
  try {
    key = Buffer.from(keyValue, 'base64');
  } catch (_error) {
    return false;
  }
  const expected = createHmac('sha256', key)
    .update(`${messageId}.${timestamp}.${raw.toString('utf8')}`, 'utf8')
    .digest();
  return signatures.some((signature) => {
    try {
      const actual = Buffer.from(signature, 'base64');
      return actual.length === expected.length && timingSafeEqual(actual, expected);
    } catch (_error) {
      return false;
    }
  });
}

export async function handleResendWebhook(req: Request, res: Response): Promise<void> {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
  const providers = listStoredEmailProviders().filter((provider) => provider.type === 'resend' && provider.enabled);
  const verified = providers.some((provider) => {
    const secret = String(readEmailProviderSecrets(provider).webhookSecret || '');
    return Boolean(secret) && verifySignature(raw, req.headers, secret);
  });
  if (!verified) {
    res.status(401).json({ success: false, message: 'Webhook signature is invalid' });
    return;
  }
  let event: { type?: string; data?: { email_id?: string; id?: string } };
  try {
    event = JSON.parse(raw.toString('utf8')) as typeof event;
  } catch (_error) {
    res.status(400).json({ success: false, message: 'Webhook payload is invalid' });
    return;
  }
  const providerMessageId = String(event.data?.email_id || event.data?.id || '');
  if (!providerMessageId || !event.type) {
    res.status(400).json({ success: false, message: 'Webhook event is incomplete' });
    return;
  }
  await applyProviderEvent({ providerType: 'resend', providerMessageId, eventType: event.type });
  res.status(202).json({ success: true });
}
