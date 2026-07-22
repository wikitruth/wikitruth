'use strict';

import { createHash, randomBytes } from 'crypto';
import appModForDb from '../app';

const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;

function normalizeCode(value: unknown): string {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export function hashRecoveryCode(value: unknown): string {
  return createHash('sha256').update(normalizeCode(value), 'utf8').digest('hex');
}

function createRecoveryCode(): string {
  const compact = randomBytes(12)
    .toString('base64url')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 16);
  return `WT-${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}`;
}

export async function replaceRecoveryCodes(userId: string, count: number): Promise<string[]> {
  const codes = Array.from({ length: Math.max(1, Math.min(count, 20)) }, createRecoveryCode);
  const now = new Date();
  await db.RecoveryCodeSet.findOneAndUpdate(
    { userId },
    {
      $set: {
        batchId: randomBytes(16).toString('hex'),
        codes: codes.map(code => ({ hash: hashRecoveryCode(code), usedAt: null })),
        editDate: now,
      },
      $setOnInsert: { createDate: now },
    },
    { upsert: true, new: true }
  );
  return codes;
}

export async function recoveryCodeStatus(
  userId: string
): Promise<{ configured: boolean; unusedCount: number; createdAt: Date | null }> {
  const record = await db.RecoveryCodeSet.findOne({ userId }).lean();
  if (!record) return { configured: false, unusedCount: 0, createdAt: null };
  return {
    configured: true,
    unusedCount: Array.isArray(record.codes)
      ? record.codes.filter((code: { usedAt?: Date | null }) => !code.usedAt).length
      : 0,
    createdAt: record.createDate || null,
  };
}

export async function consumeRecoveryCode(userId: string, code: unknown): Promise<boolean> {
  const hash = hashRecoveryCode(code);
  if (!/^[a-f\d]{64}$/.test(hash) || normalizeCode(code).length < 12) return false;
  const used = await db.RecoveryCodeSet.findOneAndUpdate(
    { userId, codes: { $elemMatch: { hash, usedAt: null } } },
    { $set: { 'codes.$.usedAt': new Date(), editDate: new Date() } },
    { new: true }
  ).lean();
  return Boolean(used);
}
