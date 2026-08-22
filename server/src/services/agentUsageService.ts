'use strict';

const WINDOW_MS = 60_000;
const BUCKET_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;
const ACCOUNTING_FLUSH_MS = 10_000;
const ACCOUNTING_FLUSH_COUNT = 25;

type Models = Record<string, any>;
type UsageBatch = {
  models: Models;
  count: number;
  lastUsedAt: Date;
  lastIp: string;
  timer: ReturnType<typeof setTimeout> | null;
};

const usageBatches = new Map<string, UsageBatch>();

function duplicateKey(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && Number((error as { code?: unknown }).code) === 11000);
}

async function queryResult(value: any): Promise<Record<string, any> | null> {
  const result = value && typeof value.lean === 'function' ? await value.lean() : await value;
  return result ? result as Record<string, any> : null;
}

export async function consumeAgentRateLimit(input: {
  models: Models;
  apiClientId: string;
  limit: number;
  ip: string;
  now?: Date;
}): Promise<{ count: number; remaining: number; resetAt: Date; allowed: boolean }> {
  const now = input.now || new Date();
  const windowStart = new Date(Math.floor(now.getTime() / WINDOW_MS) * WINDOW_MS);
  const resetAt = new Date(windowStart.getTime() + WINDOW_MS);
  const model = input.models.ApiClientRateBucket;
  if (!model?.findOneAndUpdate) throw new Error('Agent rate-limit storage is unavailable');
  const filter = { apiClientId: input.apiClientId, windowStart };
  const update = {
    $inc: { count: 1 },
    $set: { limit: input.limit, lastIp: input.ip, editDate: now },
    $setOnInsert: { createDate: now, expiresAt: new Date(now.getTime() + BUCKET_RETENTION_MS) },
  };
  let bucket: Record<string, any> | null;
  try {
    bucket = await queryResult(model.findOneAndUpdate(filter, update, { upsert: true, new: true, setDefaultsOnInsert: true }));
  } catch (error) {
    if (!duplicateKey(error)) throw error;
    bucket = await queryResult(model.findOneAndUpdate(filter, { $inc: { count: 1 }, $set: update.$set }, { new: true }));
  }
  if (!bucket) throw new Error('Agent rate-limit bucket could not be updated');
  const count = Math.max(1, Number(bucket.count || 1));
  return { count, remaining: Math.max(0, input.limit - count), resetAt, allowed: count <= input.limit };
}

async function flushUsageBatch(apiClientId: string): Promise<void> {
  const batch = usageBatches.get(apiClientId);
  if (!batch) return;
  usageBatches.delete(apiClientId);
  if (batch.timer) clearTimeout(batch.timer);
  await batch.models.ApiClient.updateOne(
    { _id: apiClientId, status: 'active' },
    {
      $set: { lastUsedAt: batch.lastUsedAt, lastUsedIp: batch.lastIp },
      $inc: { requestCount: batch.count },
    },
  );
}

export function queueApiClientUsage(models: Models, apiClientId: string, ip: string, now = new Date()): void {
  const batch = usageBatches.get(apiClientId) || {
    models, count: 0, lastUsedAt: now, lastIp: ip, timer: null,
  };
  batch.models = models;
  batch.count += 1;
  batch.lastUsedAt = now;
  batch.lastIp = ip;
  usageBatches.set(apiClientId, batch);
  if (batch.count >= ACCOUNTING_FLUSH_COUNT) {
    void flushUsageBatch(apiClientId).catch((error: unknown) => console.error('Agent usage accounting failed:', error));
    return;
  }
  if (!batch.timer) {
    batch.timer = setTimeout(() => {
      void flushUsageBatch(apiClientId).catch((error: unknown) => console.error('Agent usage accounting failed:', error));
    }, ACCOUNTING_FLUSH_MS);
    batch.timer.unref?.();
  }
}

export async function flushApiClientUsageForTests(): Promise<void> {
  await Promise.all([...usageBatches.keys()].map(flushUsageBatch));
}

export function resetAgentUsageForTests(): void {
  usageBatches.forEach((batch) => { if (batch.timer) clearTimeout(batch.timer); });
  usageBatches.clear();
}
