import appModForDb from '../app';

type LeanManyQuery = {
  select: (value: string) => LeanManyQuery;
  sort: (value: Record<string, 1 | -1>) => LeanManyQuery;
  limit: (value: number) => LeanManyQuery;
  lean: () => Promise<Record<string, unknown>[]>;
};
type LeanOneQuery = {
  select: (value: string) => LeanOneQuery;
  lean: () => Promise<Record<string, unknown> | null>;
};
type DataModel = {
  countDocuments: (query: Record<string, unknown>) => Promise<number>;
  find: (query: Record<string, unknown>) => LeanManyQuery;
  findById: (id: string) => LeanOneQuery;
  findByIdAndUpdate: (id: string, update: Record<string, unknown>, options: Record<string, unknown>) => LeanOneQuery;
  updateMany: (query: Record<string, unknown>, update: Record<string, unknown>) => Promise<{ modifiedCount?: number }>;
  deleteMany: (query: Record<string, unknown>) => Promise<{ deletedCount?: number }>;
};
type PrivacyDataModels = Record<string, DataModel>;

const db = (appModForDb as unknown as { db: { models: PrivacyDataModels } }).db.models;
const contributionModels = ['Topic', 'Argument', 'Question', 'Answer', 'Issue', 'Opinion', 'Artifact', 'Page'] as const;

function requiredModel(name: string): DataModel {
  const model = db[name];
  if (!model) throw new Error(`Required privacy data model is unavailable: ${name}`);
  return model;
}

const excludedExportKeys = /^(?:password|resetPasswordToken|resetPasswordExpires|mobileTokens|secretHash|tokenHash|linkTokenHash|completionTokenHash|codeHash|publicKey|privateKey|encryptedPayload|filePath|thumbnailPath|stack)$/i;

function safeExportValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(safeExportValue);
  if (!value || typeof value !== 'object' || value instanceof Date) return value;
  if (Buffer.isBuffer(value)) return '[binary value omitted]';
  const possibleObjectId = value as { toHexString?: () => string };
  if (typeof possibleObjectId.toHexString === 'function') return possibleObjectId.toHexString();
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((result, [key, nested]) => {
    if (!excludedExportKeys.test(key)) result[key] = safeExportValue(nested);
    return result;
  }, {});
}

function publicDocument(value: Record<string, unknown>): Record<string, unknown> {
  return safeExportValue(value) as Record<string, unknown>;
}

export async function countPrivacyImpact(userId: string) {
  const counts = await Promise.all([
    ...contributionModels.map(async (name) => [name.toLowerCase(), await requiredModel(name).countDocuments({ createUserId: userId })] as const),
    requiredModel('EntryRevision').countDocuments({ createUserId: userId }).then((count) => ['revisions', count] as const),
    requiredModel('WebSession').countDocuments({ userId, revokedAt: null }).then((count) => ['activeSessions', count] as const),
    requiredModel('PasskeyCredential').countDocuments({ userId, status: 'active' }).then((count) => ['activePasskeys', count] as const),
    requiredModel('ApiClient').countDocuments({ userId, status: 'active' }).then((count) => ['activeApiClients', count] as const),
    requiredModel('Notification').countDocuments({ userId }).then((count) => ['notifications', count] as const),
    requiredModel('Subscription').countDocuments({ userId, active: true }).then((count) => ['subscriptions', count] as const),
    requiredModel('Reaction').countDocuments({ userId }).then((count) => ['reactions', count] as const),
    requiredModel('TenantMembership').countDocuments({ userId }).then((count) => ['tenantMemberships', count] as const),
  ]);
  const result = Object.fromEntries(counts);
  return {
    ...result,
    retainedContributions: contributionModels.reduce((sum, name) => sum + Number(result[name.toLowerCase()] || 0), 0),
  };
}

async function exportedDocuments(modelName: string, query: Record<string, unknown>, limit = 10000) {
  if (!db[modelName]) return [];
  const records = await requiredModel(modelName).find(query).sort({ createDate: 1 }).limit(limit).lean();
  return records.map(publicDocument);
}

export async function buildPrivacyExport(userId: string) {
  const user = await requiredModel('User').findById(userId)
    .select('username email roles onboarding isActive adminOperations securityOperations timeCreated preferences')
    .lean();
  if (!user) throw new Error('Privacy request subject no longer exists');
  const contributions = Object.fromEntries(await Promise.all(contributionModels.map(async (modelName) => [
    modelName.toLowerCase(),
    await exportedDocuments(modelName, { createUserId: userId }),
  ])));
  const [revisions, notifications, subscriptions, reactions, memberships, apiClients, sessions] = await Promise.all([
    exportedDocuments('EntryRevision', { createUserId: userId }),
    exportedDocuments('Notification', { userId }),
    exportedDocuments('Subscription', { userId }),
    exportedDocuments('Reaction', { userId }),
    exportedDocuments('TenantMembership', { userId }),
    requiredModel('ApiClient').find({ userId }).select('clientId name description scopes status expiresAt rateLimitPerMinute lastUsedAt createDate revokedAt').sort({ createDate: 1 }).limit(1000).lean(),
    requiredModel('WebSession').find({ userId }).select('authenticationMethod remembered createDate lastActivityAt absoluteExpiresAt revokedAt revokedReason').sort({ createDate: 1 }).limit(1000).lean(),
  ]);
  return {
    format: 'Wikitruth privacy export', version: 1, generatedAt: new Date().toISOString(),
    subjectId: userId, account: publicDocument(user), contributions,
    activity: { revisions, notifications, subscriptions, reactions, tenantMemberships: memberships },
    security: { apiClients: apiClients.map(publicDocument), sessions: sessions.map(publicDocument) },
  };
}

async function updateMany(modelName: string, query: Record<string, unknown>, update: Record<string, unknown>): Promise<number> {
  if (!db[modelName]) return 0;
  const result = await requiredModel(modelName).updateMany(query, update);
  return Number(result.modifiedCount || 0);
}

async function deleteMany(modelName: string, query: Record<string, unknown>): Promise<number> {
  if (!db[modelName]) return 0;
  const result = await requiredModel(modelName).deleteMany(query);
  return Number(result.deletedCount || 0);
}

export async function anonymizeAccount(userId: string, actorUserId: string) {
  const user = await requiredModel('User').findById(userId).select('username email roles').lean();
  if (!user) throw new Error('Privacy request subject no longer exists');
  const previousEmail = String(user.email || '');
  const pseudonym = `anonymous-${userId.slice(-10).toLowerCase()}`;
  const now = new Date();
  const revoked = await Promise.all([
    updateMany('WebSession', { userId, revokedAt: null }, { $set: { revokedAt: now, revokedReason: 'privacy_anonymization' } }),
    updateMany('PasskeyCredential', { userId, status: 'active' }, { $set: { status: 'revoked', revokedAt: now, revokedByUserId: actorUserId } }),
    updateMany('ApiClient', { userId, status: 'active' }, { $set: { status: 'revoked', revokedAt: now, revokedByUserId: actorUserId, lastUsedIp: '' } }),
  ]);
  const removed = await Promise.all([
    deleteMany('RecoveryCodeSet', { userId }), deleteMany('AuthCeremony', { userId }),
    deleteMany('AuthHandoff', { userId }), deleteMany('TrustedClient', { userId }),
    deleteMany('EmailAuthChallenge', { $or: [{ userId }, ...(previousEmail ? [{ email: previousEmail }] : [])] }),
    deleteMany('LoginAttempt', { user: { $in: [String(user.username || ''), previousEmail].filter(Boolean) } }),
    deleteMany('Subscription', { userId }), deleteMany('Reaction', { userId }),
    deleteMany('ReaderSignal', { createUserId: userId }), deleteMany('NotificationOutbox', { userId }),
    deleteMany('EmailOutbox', { actorUserId: userId }),
    deleteMany('Notification', { userId }), deleteMany('TenantMembership', { userId }),
    deleteMany('ReputationSnapshot', { userId }),
  ]);
  await updateMany('Group', { 'members.userId': userId }, { $pull: { members: { userId } } });
  const account = await requiredModel('User').findByIdAndUpdate(userId, {
    $set: {
      username: pseudonym,
      email: `anonymized-${userId.toLowerCase()}@privacy.invalid`,
      passwordLoginDisabled: true,
      roles: { admin: null, account: null, screener: false, reviewer: false },
      isActive: 'no',
      mobileTokens: [], twitter: {}, github: {}, facebook: {}, google: {}, apple: {}, microsoft: {}, tumblr: {},
      preferences: {}, search: [pseudonym], resetPasswordToken: '', resetPasswordExpires: null,
      adminOperations: {
        state: 'deactivated', reason: 'Account anonymized through approved privacy request', riskLabels: [],
        changedAt: now, changedByUserId: actorUserId, actionId: '', previousState: '', previousIsActive: '', undoUntil: null,
      },
      securityOperations: { lockedAt: now, lockedReason: 'Account anonymized', lockedByUserId: actorUserId },
    },
    $unset: { password: 1 },
  }, { new: true }).select('_id username isActive').lean();
  if (!account) throw new Error('Account anonymization did not complete');
  return {
    pseudonym,
    revokedSessions: revoked[0], revokedPasskeys: revoked[1], revokedApiClients: revoked[2],
    removedPrivateRecords: removed.reduce((sum, count) => sum + count, 0),
  };
}
