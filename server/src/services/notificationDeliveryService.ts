import appModForDb from '../app';

const db = (appModForDb as unknown as { db: { models: Record<string, unknown> } }).db.models as {
  User: {
    findById: (id: string) => { select: (fields: string) => { lean: () => Promise<Record<string, unknown> | null> } };
    findByIdAndUpdate: (id: string, update: Record<string, unknown>, options: Record<string, unknown>) => {
      select: (fields: string) => { lean: () => Promise<Record<string, unknown> | null> };
    };
  };
  NotificationOutbox: {
    insertMany: (rows: Array<Record<string, unknown>>) => Promise<unknown>;
    find: (query: Record<string, unknown>) => {
      sort: (sort: Record<string, number>) => { limit: (limit: number) => { lean: () => Promise<unknown[]> } };
    };
    findOneAndUpdate: (query: Record<string, unknown>, update: Record<string, unknown>, options: Record<string, unknown>) => {
      lean: () => Promise<Record<string, unknown> | null>;
    };
  };
};

export interface NotificationPreferences {
  inApp: { enabled: boolean };
  emailDigest: { enabled: boolean; frequency: 'daily' | 'weekly' };
  webPush: { enabled: boolean };
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  inApp: { enabled: true },
  emailDigest: { enabled: false, frequency: 'daily' },
  webPush: { enabled: false },
};

export function nextDigestAvailableAt(frequency: 'daily' | 'weekly', now = new Date()): Date {
  const next = new Date(now);
  next.setUTCHours(8, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  if (frequency === 'weekly') {
    while (next.getUTCDay() !== 1) next.setUTCDate(next.getUTCDate() + 1);
  }
  return next;
}

function normalizePreferences(value: unknown): NotificationPreferences {
  const input = (value || {}) as Record<string, Record<string, unknown> | undefined>;
  return {
    inApp: { enabled: input.inApp?.enabled !== false },
    emailDigest: {
      enabled: input.emailDigest?.enabled === true,
      frequency: input.emailDigest?.frequency === 'weekly' ? 'weekly' : 'daily',
    },
    webPush: { enabled: input.webPush?.enabled === true },
  };
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const user = await db.User.findById(userId).select('preferences.notifications').lean();
  const preferences = (user?.preferences || {}) as Record<string, unknown>;
  return normalizePreferences(preferences.notifications);
}

export async function setNotificationPreferences(userId: string, value: unknown): Promise<NotificationPreferences> {
  const preferences = normalizePreferences(value);
  const user = await db.User.findByIdAndUpdate(
    userId,
    { $set: { 'preferences.notifications': preferences } },
    { new: true },
  ).select('preferences.notifications').lean();
  if (!user) throw new Error('User not found');
  return preferences;
}

export async function queueNotificationDeliveries(input: {
  userId: string;
  notificationId: unknown;
  preferences: NotificationPreferences;
  payload: Record<string, unknown>;
}): Promise<void> {
  const now = new Date();
  const rows = [
    {
      userId: input.userId, notificationId: input.notificationId, channel: 'in_app',
      status: input.preferences.inApp.enabled ? 'delivered' : 'skipped',
      availableAt: now, deliveredAt: input.preferences.inApp.enabled ? now : null,
      payload: input.payload, createDate: now, editDate: now,
    },
    {
      userId: input.userId, notificationId: input.notificationId, channel: 'email_digest',
      status: input.preferences.emailDigest.enabled ? 'queued' : 'skipped',
      availableAt: nextDigestAvailableAt(input.preferences.emailDigest.frequency, now),
      payload: { ...input.payload, digestFrequency: input.preferences.emailDigest.frequency }, createDate: now, editDate: now,
    },
    {
      userId: input.userId, notificationId: input.notificationId, channel: 'web_push',
      status: input.preferences.webPush.enabled ? 'queued' : 'skipped', availableAt: now,
      payload: input.payload, createDate: now, editDate: now,
    },
  ];
  await db.NotificationOutbox.insertMany(rows);
}

export async function listNotificationOutbox(userId: string, options: { channel?: string; status?: string; limit?: number }) {
  const query: Record<string, unknown> = { userId };
  if (['in_app', 'email_digest', 'web_push'].includes(String(options.channel || ''))) query.channel = options.channel;
  if (['queued', 'processing', 'delivered', 'failed', 'skipped'].includes(String(options.status || ''))) query.status = options.status;
  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 100);
  return db.NotificationOutbox.find(query).sort({ createDate: -1 }).limit(limit).lean();
}

export async function retryNotificationDelivery(userId: string, outboxId: string) {
  return db.NotificationOutbox.findOneAndUpdate(
    { _id: outboxId, userId, status: 'failed' },
    { $set: { status: 'queued', availableAt: new Date(), lastError: '', editDate: new Date() } },
    { new: true },
  ).lean();
}
