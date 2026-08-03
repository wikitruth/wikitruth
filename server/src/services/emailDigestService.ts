import appModForDb from '../app';
import { queueEmail } from './emailOutboxService';

interface DigestRow {
  _id: unknown;
  userId: unknown;
  payload?: Record<string, unknown>;
  availableAt: Date;
}

interface Query<T> {
  sort: (sort: Record<string, number>) => Query<T>;
  limit: (limit: number) => Query<T>;
  lean: () => Promise<T>;
}

interface DigestModels {
  NotificationOutbox: {
    find: (query: Record<string, unknown>) => Query<DigestRow[]>;
    updateMany: (query: Record<string, unknown>, update: Record<string, unknown>) => Promise<{ modifiedCount?: number }>;
  };
  User: {
    findById: (id: unknown) => Query<Record<string, unknown> | null>;
  };
}

const db = (appModForDb as unknown as { db: { models: DigestModels } }).db.models;

function periodKey(frequency: 'daily' | 'weekly', date: Date): string {
  if (frequency === 'daily') return date.toISOString().slice(0, 10);
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() - day + 1);
  return copy.toISOString().slice(0, 10);
}

export async function queueDueNotificationDigests(limit = 250): Promise<number> {
  const rows = await db.NotificationOutbox.find({
    channel: 'email_digest',
    status: 'queued',
    availableAt: { $lte: new Date() },
  }).sort({ availableAt: 1, createDate: 1 }).limit(Math.min(Math.max(limit, 1), 1000)).lean();
  const groups = new Map<string, DigestRow[]>();
  rows.forEach((row) => {
    const frequency = row.payload?.digestFrequency === 'weekly' ? 'weekly' : 'daily';
    const key = `${String(row.userId)}:${frequency}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  });
  let queued = 0;
  for (const [key, group] of groups.entries()) {
    const [userId, rawFrequency] = key.split(':');
    const frequency = rawFrequency === 'weekly' ? 'weekly' : 'daily';
    const ids = group.map((row) => row._id);
    const claim = await db.NotificationOutbox.updateMany(
      { _id: { $in: ids }, status: 'queued' },
      { $set: { status: 'processing', editDate: new Date() }, $inc: { attempts: 1 } },
    );
    if (!claim.modifiedCount) continue;
    const user = await db.User.findById(userId).lean();
    const email = String(user?.email || '').trim().toLowerCase();
    if (!email) {
      await db.NotificationOutbox.updateMany(
        { _id: { $in: ids } },
        { $set: { status: 'failed', lastError: 'User has no email address', editDate: new Date() } },
      );
      continue;
    }
    const items = group.map((row) => ({
      title: String(row.payload?.title || 'Wikitruth activity'),
      body: String(row.payload?.body || ''),
      link: String(row.payload?.link || ''),
    }));
    try {
      await queueEmail({
        templateKey: frequency === 'weekly' ? 'weekly_digest' : 'daily_digest',
        to: email,
        locals: {
          projectName: 'Wikitruth',
          recipientName: String(user?.username || ''),
          actionUrl: String(process.env.WIKITRUTH_PUBLIC_ORIGIN || process.env.WEBAUTHN_CANONICAL_ORIGIN || '').replace(/\/$/, ''),
          items,
        },
        idempotencyKey: `digest:${frequency}:${userId}:${periodKey(frequency, new Date())}`,
        sourceNotificationOutboxIds: ids,
      });
      queued += 1;
    } catch (error) {
      await db.NotificationOutbox.updateMany(
        { _id: { $in: ids }, status: 'processing' },
        { $set: { status: 'queued', lastError: String((error as Error)?.message || error).slice(0, 500), editDate: new Date() } },
      );
    }
  }
  return queued;
}
