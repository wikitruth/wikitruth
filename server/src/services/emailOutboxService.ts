import { createHash, randomUUID } from 'crypto';
import { decryptEmailPayload, encryptEmailPayload } from './emailProviderStore';
import { renderEmailTemplate, type EmailTemplateKey, type EmailTemplateLocals } from './emailCatalog';
import {
  EmailDeliveryError,
  resolveEmailProvider,
  sendEmailWithProvider,
  type EmailDeliveryReceipt,
} from './emailTransport';

interface EmailPayload {
  to: string;
  locals: EmailTemplateLocals;
  replyTo?: string;
}

interface EmailOutboxRecord {
  _id: unknown;
  templateKey: EmailTemplateKey;
  encryptedPayload?: string;
  idempotencyKey: string;
  status: 'queued' | 'processing' | 'delivered' | 'failed' | 'suppressed';
  attempts: number;
  maxAttempts: number;
  expiresAt?: Date | null;
  sourceNotificationOutboxIds?: unknown[];
}

interface Query<T> {
  select: (fields: string) => Query<T>;
  sort: (sort: Record<string, number>) => Query<T>;
  limit: (limit: number) => Query<T>;
  lean: () => Promise<T>;
}

interface EmailOutboxModel {
  create: (value: Record<string, unknown>) => Promise<{ toObject: () => EmailOutboxRecord }>;
  findOne: (query: Record<string, unknown>) => Query<EmailOutboxRecord | null>;
  find: (query: Record<string, unknown>) => Query<EmailOutboxRecord[]>;
  findOneAndUpdate: (
    query: Record<string, unknown>,
    update: Record<string, unknown>,
    options: Record<string, unknown>,
  ) => Query<EmailOutboxRecord | null>;
  updateOne: (query: Record<string, unknown>, update: Record<string, unknown>) => Promise<unknown>;
}

interface NotificationOutboxModel {
  updateMany: (query: Record<string, unknown>, update: Record<string, unknown>) => Promise<unknown>;
}

interface EmailModels {
  EmailOutbox: EmailOutboxModel;
  NotificationOutbox: NotificationOutboxModel;
}

function models(): EmailModels {
  const globalApp = (globalThis as unknown as Record<string, unknown>).__wikitruth_app;
  const loaded = globalApp ? null : require('../app') as { default?: unknown };
  const activeApp = globalApp || loaded?.default || loaded;
  return (activeApp as { db: { models: EmailModels } }).db.models;
}

export interface QueueEmailInput {
  templateKey: EmailTemplateKey;
  to: string;
  locals: EmailTemplateLocals;
  idempotencyKey?: string;
  replyTo?: string;
  expiresAt?: Date;
  test?: boolean;
  actorUserId?: string;
  sourceNotificationOutboxIds?: unknown[];
  maxAttempts?: number;
}

export interface PublicEmailDelivery {
  id: string;
  templateKey: string;
  recipientMasked: string;
  status: string;
  providerName: string;
  providerType: string;
  providerMessageId: string;
  attempts: number;
  maxAttempts: number;
  availableAt: Date;
  deliveredAt: Date | null;
  test: boolean;
  lastError: string;
  errorCode: string;
  createDate: Date;
}

function normalizeEmail(value: string): string {
  return String(value || '').trim().toLowerCase();
}

export function maskRecipient(value: string): string {
  const [local = '', domain = ''] = normalizeEmail(value).split('@');
  return domain ? `${local.slice(0, 1)}***@${domain}` : '***';
}

function recipientHash(value: string): string {
  return createHash('sha256').update(normalizeEmail(value), 'utf8').digest('hex');
}

function retryDelay(attempt: number): number {
  return [30_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000][Math.max(0, attempt - 1)] || 2 * 60 * 60_000;
}

function duplicateKey(error: unknown): boolean {
  return Number((error as { code?: unknown })?.code) === 11000;
}

export async function queueEmail(input: QueueEmailInput): Promise<EmailOutboxRecord> {
  const to = normalizeEmail(input.to);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error('A valid email recipient is required');
  renderEmailTemplate(input.templateKey, input.locals);
  const idempotencyKey = String(input.idempotencyKey || `${input.templateKey}:${randomUUID()}`).slice(0, 200);
  const now = new Date();
  const value = {
    templateKey: input.templateKey,
    recipientMasked: maskRecipient(to),
    recipientHash: recipientHash(to),
    encryptedPayload: encryptEmailPayload<EmailPayload>({ to, locals: input.locals, replyTo: input.replyTo }),
    idempotencyKey,
    status: 'queued',
    attempts: 0,
    maxAttempts: Math.min(Math.max(input.maxAttempts || 4, 1), 8),
    availableAt: now,
    expiresAt: input.expiresAt || null,
    test: input.test === true,
    actorUserId: input.actorUserId || null,
    sourceNotificationOutboxIds: input.sourceNotificationOutboxIds || [],
    createDate: now,
    editDate: now,
  };
  try {
    const created = await models().EmailOutbox.create(value);
    return created.toObject();
  } catch (error) {
    if (!duplicateKey(error)) throw error;
    const existing = await models().EmailOutbox.findOne({ idempotencyKey }).select('+encryptedPayload').lean();
    if (!existing) throw error;
    return existing;
  }
}

async function claim(id: unknown): Promise<EmailOutboxRecord | null> {
  const now = new Date();
  return models().EmailOutbox.findOneAndUpdate(
    {
      _id: id,
      status: 'queued',
      availableAt: { $lte: now },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    },
    { $set: { status: 'processing', editDate: now }, $inc: { attempts: 1 } },
    { new: true },
  ).select('+encryptedPayload').lean();
}

export async function deliverEmailOutboxItem(id: unknown): Promise<EmailDeliveryReceipt | null> {
  const item = await claim(id);
  if (!item) return null;
  try {
    const resolved = resolveEmailProvider();
    if (!resolved) {
      throw new EmailDeliveryError('No active administrator-managed email provider', {
        transient: false,
        code: 'NO_ACTIVE_PROVIDER',
      });
    }
    if (!item.encryptedPayload) throw new Error('Email payload is unavailable');
    const payload = decryptEmailPayload<EmailPayload>(item.encryptedPayload);
    const rendered = renderEmailTemplate(item.templateKey, payload.locals);
    const receipt = await sendEmailWithProvider(resolved.provider, resolved.secrets, {
      to: payload.to,
      replyTo: payload.replyTo,
      idempotencyKey: item.idempotencyKey,
      ...rendered,
    });
    await models().EmailOutbox.updateOne({ _id: item._id }, {
      $set: {
        status: 'delivered',
        providerId: receipt.providerId,
        providerName: receipt.providerName,
        providerType: receipt.providerType,
        providerMessageId: receipt.providerMessageId,
        deliveredAt: new Date(),
        lastError: '',
        errorCode: '',
        encryptedPayload: encryptEmailPayload<EmailPayload>({ to: '', locals: {} }),
        editDate: new Date(),
      },
    });
    if (item.sourceNotificationOutboxIds?.length) {
      await models().NotificationOutbox.updateMany(
        { _id: { $in: item.sourceNotificationOutboxIds } },
        { $set: { status: 'delivered', deliveredAt: new Date(), lastError: '', editDate: new Date() } },
      );
    }
    return receipt;
  } catch (error) {
    const deliveryError = error instanceof EmailDeliveryError
      ? error
      : new EmailDeliveryError(String((error as Error)?.message || error).slice(0, 500), {
          transient: true,
          code: 'EMAIL_DELIVERY_FAILED',
        });
    const retry = deliveryError.transient && item.attempts < item.maxAttempts;
    await models().EmailOutbox.updateOne({ _id: item._id }, {
      $set: {
        status: retry ? 'queued' : 'failed',
        availableAt: retry ? new Date(Date.now() + retryDelay(item.attempts)) : new Date(),
        lastError: deliveryError.message.slice(0, 500),
        errorCode: deliveryError.code.slice(0, 100),
        editDate: new Date(),
      },
    });
    if (!retry && item.sourceNotificationOutboxIds?.length) {
      await models().NotificationOutbox.updateMany(
        { _id: { $in: item.sourceNotificationOutboxIds } },
        { $set: { status: 'failed', lastError: deliveryError.message.slice(0, 500), editDate: new Date() } },
      );
    }
    throw deliveryError;
  }
}

export async function queueAndDeliverEmail(input: QueueEmailInput): Promise<EmailDeliveryReceipt | null> {
  const item = await queueEmail(input);
  if (item.status === 'delivered') return null;
  return deliverEmailOutboxItem(item._id);
}

export async function processEmailOutboxBatch(limit = 10): Promise<{ attempted: number; delivered: number }> {
  const now = new Date();
  const rows = await models().EmailOutbox.find({
    status: 'queued',
    availableAt: { $lte: now },
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  }).sort({ availableAt: 1, createDate: 1 }).limit(Math.min(Math.max(limit, 1), 50)).lean();
  let delivered = 0;
  for (const row of rows) {
    try {
      if (await deliverEmailOutboxItem(row._id)) delivered += 1;
    } catch (_error) {
      // The item records its own classified failure and retry schedule.
    }
  }
  return { attempted: rows.length, delivered };
}

export async function listRecentEmailDeliveries(limit = 50): Promise<PublicEmailDelivery[]> {
  const rows = await models().EmailOutbox.find({}).sort({ createDate: -1 }).limit(Math.min(Math.max(limit, 1), 100)).lean();
  return rows.map((row) => {
    const record = row as unknown as Record<string, unknown>;
    return {
      id: String(record._id || ''),
      templateKey: String(record.templateKey || ''),
      recipientMasked: String(record.recipientMasked || ''),
      status: String(record.status || ''),
      providerName: String(record.providerName || ''),
      providerType: String(record.providerType || ''),
      providerMessageId: String(record.providerMessageId || ''),
      attempts: Number(record.attempts || 0),
      maxAttempts: Number(record.maxAttempts || 0),
      availableAt: record.availableAt as Date,
      deliveredAt: (record.deliveredAt as Date | null) || null,
      test: record.test === true,
      lastError: String(record.lastError || ''),
      errorCode: String(record.errorCode || ''),
      createDate: record.createDate as Date,
    };
  });
}

export async function retryEmailDelivery(id: string): Promise<boolean> {
  const row = await models().EmailOutbox.findOneAndUpdate(
    { _id: id, status: 'failed', attempts: { $lt: 8 } },
    { $set: { status: 'queued', availableAt: new Date(), lastError: '', errorCode: '', editDate: new Date() } },
    { new: true },
  ).lean();
  return Boolean(row);
}

export async function applyProviderEvent(input: {
  providerType: 'resend';
  providerMessageId: string;
  eventType: string;
}): Promise<boolean> {
  const event = input.eventType.toLowerCase();
  const delivered = event === 'email.delivered' || event === 'delivered';
  const suppressed = event === 'email.complained' || event === 'email.bounced' || event === 'complained' || event === 'bounced';
  if (!delivered && !suppressed) return false;
  const row = await models().EmailOutbox.findOneAndUpdate(
    { providerType: input.providerType, providerMessageId: input.providerMessageId },
    { $set: delivered ? {
      status: 'delivered', deliveredAt: new Date(), editDate: new Date(), lastError: '', errorCode: '',
    } : {
      status: 'suppressed', editDate: new Date(), lastError: `Provider event: ${event}`,
      errorCode: event.includes('complain') ? 'COMPLAINT' : 'HARD_BOUNCE',
    } },
    { new: true },
  ).lean();
  return Boolean(row);
}
