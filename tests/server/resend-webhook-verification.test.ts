import { createHmac } from 'crypto';
import { verifyResendWebhookSignature } from '../../server/src/services/resendWebhookVerification';

describe('Resend webhook verification', () => {
  const now = Date.UTC(2026, 7, 4, 8, 0, 0);
  const timestamp = String(now / 1000);
  const id = 'msg_webhook_1';
  const raw = Buffer.from('{"type":"email.delivered","data":{"email_id":"email_1"}}');
  const key = Buffer.from('test-webhook-key');
  const secret = `whsec_${key.toString('base64')}`;

  function signature(body = raw): string {
    return createHmac('sha256', key).update(`${id}.${timestamp}.${body.toString('utf8')}`).digest('base64');
  }

  it('accepts an authentic raw payload inside the clock window', () => {
    expect(verifyResendWebhookSignature(raw, {
      'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': `v1,${signature()}`,
    }, secret, now)).toBe(true);
  });

  it('rejects tampering and stale timestamps', () => {
    expect(verifyResendWebhookSignature(Buffer.from('{"tampered":true}'), {
      'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': `v1,${signature()}`,
    }, secret, now)).toBe(false);
    expect(verifyResendWebhookSignature(raw, {
      'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': `v1,${signature()}`,
    }, secret, now + 6 * 60 * 1000)).toBe(false);
  });
});
