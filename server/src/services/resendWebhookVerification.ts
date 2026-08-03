import { createHmac, timingSafeEqual } from 'crypto';

const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

function signatureValues(header: string): string[] {
  return header.split(/\s+/).map((item) => item.trim()).filter(Boolean).flatMap((item) => {
    const [version, value] = item.split(',');
    return version === 'v1' && value ? [value] : [];
  });
}

export function verifyResendWebhookSignature(
  raw: Buffer,
  headers: Record<string, string | string[] | undefined>,
  secret: string,
  nowMs = Date.now(),
): boolean {
  const messageId = String(headers['svix-id'] || '');
  const timestamp = String(headers['svix-timestamp'] || '');
  const signatures = signatureValues(String(headers['svix-signature'] || ''));
  if (!messageId || !timestamp || !signatures.length) return false;
  const unixSeconds = Number(timestamp);
  if (!Number.isFinite(unixSeconds) || Math.abs(nowMs / 1000 - unixSeconds) > MAX_CLOCK_SKEW_SECONDS) return false;
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
