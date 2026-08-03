import type { Request, Response } from 'express';
import { applyProviderEvent } from '../../services/emailOutboxService';
import { listStoredEmailProviders, readEmailProviderSecrets } from '../../services/emailProviderStore';
import { verifyResendWebhookSignature } from '../../services/resendWebhookVerification';

export async function handleResendWebhook(req: Request, res: Response): Promise<void> {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
  const providers = listStoredEmailProviders().filter((provider) => provider.type === 'resend' && provider.enabled);
  const verified = providers.some((provider) => {
    const secret = String(readEmailProviderSecrets(provider).webhookSecret || '');
    return Boolean(secret) && verifyResendWebhookSignature(raw, req.headers, secret);
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
