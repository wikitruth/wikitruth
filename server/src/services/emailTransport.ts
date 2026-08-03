import emailjs from 'emailjs/email';
import type { EmailProviderSecrets, StoredEmailProvider } from './emailProviderStore';
import {
  getActiveStoredEmailProvider,
  readEmailProviderSecrets,
} from './emailProviderStore';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  idempotencyKey?: string;
}

export interface EmailDeliveryReceipt {
  providerId: string;
  providerName: string;
  providerType: 'resend' | 'smtp';
  providerMessageId: string;
}

export interface ResolvedEmailProvider {
  provider: StoredEmailProvider;
  secrets: EmailProviderSecrets;
  source: 'admin' | 'environment';
}

export class EmailDeliveryError extends Error {
  transient: boolean;
  code: string;
  statusCode?: number;

  constructor(message: string, options: { transient: boolean; code: string; statusCode?: number }) {
    super(message);
    this.name = 'EmailDeliveryError';
    this.transient = options.transient;
    this.code = options.code;
    this.statusCode = options.statusCode;
  }
}

function sender(provider: StoredEmailProvider): string {
  return provider.fromName
    ? `${provider.fromName.replace(/[<>\r\n]/g, '')} <${provider.fromAddress}>`
    : provider.fromAddress;
}

function smtpError(error: unknown): EmailDeliveryError {
  const source = error as { code?: unknown; message?: unknown; smtp?: unknown };
  const code = String(source?.code || 'SMTP_SEND_FAILED');
  const message = String(source?.message || source?.smtp || 'SMTP delivery failed').slice(0, 500);
  const transient = /ECONN|ETIMEDOUT|EAI_AGAIN|ENET|421|450|451|452/i.test(`${code} ${message}`);
  return new EmailDeliveryError(message, { transient, code });
}

async function sendSmtp(
  provider: StoredEmailProvider,
  secrets: EmailProviderSecrets,
  message: EmailMessage,
): Promise<string> {
  const client = emailjs.server.connect({
    user: secrets.username,
    password: secrets.password,
    host: provider.host,
    port: provider.port,
    ssl: provider.security === 'ssl',
    tls: provider.security === 'starttls',
  });
  return new Promise((resolve, reject) => {
    client.send({
      from: sender(provider),
      to: message.to,
      'reply-to': message.replyTo || provider.fromAddress,
      subject: message.subject,
      text: message.text,
      attachment: [{ data: message.html, alternative: true }],
    }, (error: unknown, result: unknown) => {
      if (error) {
        reject(smtpError(error));
        return;
      }
      const response = result as { header?: { 'message-id'?: string }; id?: string };
      resolve(String(response?.header?.['message-id'] || response?.id || ''));
    });
  });
}

async function sendResend(
  provider: StoredEmailProvider,
  secrets: EmailProviderSecrets,
  message: EmailMessage,
): Promise<string> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${String(secrets.apiKey || '')}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Wikitruth/2 email-operations',
      ...(message.idempotencyKey ? { 'Idempotency-Key': message.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: sender(provider),
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(message.replyTo ? { reply_to: message.replyTo } : {}),
    }),
  });
  const payload = await response.json().catch(() => ({})) as { id?: string; message?: string; name?: string };
  if (!response.ok) {
    throw new EmailDeliveryError(
      String(payload.message || payload.name || `Resend returned HTTP ${response.status}`).slice(0, 500),
      {
        transient: response.status === 408 || response.status === 409 || response.status === 429 || response.status >= 500,
        code: String(payload.name || `RESEND_HTTP_${response.status}`).toUpperCase(),
        statusCode: response.status,
      },
    );
  }
  if (!payload.id) {
    throw new EmailDeliveryError('Resend did not return a message ID', {
      transient: true,
      code: 'RESEND_MISSING_ID',
    });
  }
  return payload.id;
}

export async function sendEmailWithProvider(
  provider: StoredEmailProvider,
  secrets: EmailProviderSecrets,
  message: EmailMessage,
): Promise<EmailDeliveryReceipt> {
  if (!provider.enabled) {
    throw new EmailDeliveryError('Email provider is disabled', { transient: false, code: 'PROVIDER_DISABLED' });
  }
  const providerMessageId = provider.type === 'resend'
    ? await sendResend(provider, secrets, message)
    : await sendSmtp(provider, secrets, message);
  return {
    providerId: provider.id,
    providerName: provider.name,
    providerType: provider.type,
    providerMessageId,
  };
}

export async function sendEmailWithActiveProvider(message: EmailMessage): Promise<EmailDeliveryReceipt> {
  const resolved = resolveEmailProvider();
  if (!resolved) {
    throw new EmailDeliveryError('No active administrator-managed email provider', {
      transient: false,
      code: 'NO_ACTIVE_PROVIDER',
    });
  }
  return sendEmailWithProvider(resolved.provider, resolved.secrets, message);
}

export function resolveEmailProvider(): ResolvedEmailProvider | null {
  const provider = getActiveStoredEmailProvider();
  if (provider) {
    return { provider, secrets: readEmailProviderSecrets(provider), source: 'admin' };
  }
  const username = String(process.env.SMTP_USERNAME || '').trim();
  const password = String(process.env.SMTP_PASSWORD || '').trim();
  if (!username || !password) return null;
  const now = new Date(0).toISOString();
  return {
    source: 'environment',
    provider: {
      id: 'environment-smtp',
      name: 'Environment SMTP fallback',
      type: 'smtp',
      enabled: true,
      fromName: String(process.env.SMTP_FROM_NAME || 'Wikitruth').trim(),
      fromAddress: String(process.env.SMTP_FROM_ADDRESS || username).trim().toLowerCase(),
      host: String(process.env.SMTP_HOST || 'smtp.gmail.com').trim(),
      port: Number(process.env.SMTP_PORT || (process.env.SMTP_SSL === 'false' ? 587 : 465)),
      security: process.env.SMTP_SSL === 'false' ? 'starttls' : 'ssl',
      encryptedSecrets: '',
      verifiedAt: null,
      createDate: now,
      editDate: now,
    },
    secrets: { username, password },
  };
}
