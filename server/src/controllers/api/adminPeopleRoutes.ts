import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import type { Router } from 'express';

import appModForDb from '../../app';
import constants from '../../models/constants';
import { logEntryEvent } from '../../services/entryEventsService';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';

type EnsureAdmin = (req: WikitruthRequest, res: WikitruthResponse) => boolean;

type Query<T> = {
  sort: (sort: Record<string, 1 | -1>) => Query<T>;
  skip: (amount: number) => Query<T>;
  limit: (amount: number) => Query<T>;
  select: (fields: string) => Query<T>;
  lean: () => Promise<T>;
};

type UserRecord = Record<string, unknown> & {
  _id: unknown;
  username?: string;
  email?: string;
  roles?: Record<string, unknown>;
  timeCreated?: Date;
  isActive?: string;
  passwordLoginDisabled?: boolean;
  adminOperations?: Record<string, unknown>;
  securityOperations?: Record<string, unknown>;
};

type AccountRecord = Record<string, unknown> & {
  _id: unknown;
  isVerified?: string;
  name?: { full?: string };
};

type GroupRow = { _id: unknown; count: number; lastSeen?: Date };

type PeopleModels = {
  User: {
    find: (criteria: Record<string, unknown>) => Query<UserRecord[]>;
    findById: (id: string) => Query<UserRecord | null>;
    countDocuments: (criteria: Record<string, unknown>) => Promise<number>;
    updateMany: (criteria: Record<string, unknown>, update: Record<string, unknown>) => Promise<unknown>;
  };
  Account: {
    find: (criteria: Record<string, unknown>) => Query<AccountRecord[]>;
    updateOne: (criteria: Record<string, unknown>, update: Record<string, unknown>) => Promise<unknown>;
  };
  Admin: { countDocuments: (criteria: Record<string, unknown>) => Promise<number> };
  WebSession: {
    aggregate: (pipeline: Record<string, unknown>[]) => Promise<GroupRow[]>;
    updateMany: (criteria: Record<string, unknown>, update: Record<string, unknown>) => Promise<{ modifiedCount?: number }>;
  };
  PasskeyCredential: { aggregate: (pipeline: Record<string, unknown>[]) => Promise<GroupRow[]> };
  RecoveryCodeSet: { findOne: (criteria: Record<string, unknown>) => Query<Record<string, unknown> | null> };
  ApiClient: {
    aggregate: (pipeline: Record<string, unknown>[]) => Promise<GroupRow[]>;
    updateMany: (criteria: Record<string, unknown>, update: Record<string, unknown>) => Promise<unknown>;
  };
} & Record<string, {
  distinct?: (field: string, criteria: Record<string, unknown>) => Promise<unknown[]>;
  aggregate?: (pipeline: Record<string, unknown>[]) => Promise<GroupRow[]>;
}>;

const db = (appModForDb as unknown as { db: { models: PeopleModels } }).db.models;
const CONTENT_MODELS = ['Topic', 'Argument', 'Question', 'Answer', 'Issue', 'Opinion', 'Artifact', 'Page', 'Definition', 'Meaning', 'Word'];
const MAX_PAGE_SIZE = 100;
const PREVIEW_TTL_MS = 10 * 60 * 1000;
const UNDO_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function escapedRegex(value: string): RegExp {
  return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

function intValue(value: unknown, fallback: number, max: number): number {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

function actorId(req: WikitruthRequest): string {
  return String(req.user?._id || req.user?.id || '');
}

function tokenSecret(req: WikitruthRequest): string {
  const app = req.app as unknown as { config?: { cryptoKey?: string } };
  return String(app.config?.cryptoKey || process.env.SESSION_SECRET || '');
}

function previewToken(req: WikitruthRequest, payload: Record<string, unknown>): string {
  const secret = tokenSecret(req);
  if (!secret) throw new Error('Admin action signing is not configured');
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function verifyPreviewToken(req: WikitruthRequest, token: string): Record<string, unknown> | null {
  const [encoded, signature] = token.split('.');
  const secret = tokenSecret(req);
  if (!encoded || !signature || !secret) return null;
  const expected = createHmac('sha256', secret).update(encoded).digest('base64url');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Record<string, unknown>;
    if (Number(payload.expiresAt || 0) < Date.now()) return null;
    return payload;
  } catch (_error) {
    return null;
  }
}

function operationState(user: UserRecord): string {
  const state = String(user.adminOperations?.state || '').trim();
  if (state) return state;
  return user.isActive && user.isActive !== 'yes' ? 'deactivated' : 'active';
}

async function activityUserIds(): Promise<string[]> {
  const values = await Promise.all(CONTENT_MODELS.map(async (modelName) => {
    const model = db[modelName];
    return model?.distinct ? model.distinct('createUserId', {}) : [];
  }));
  return Array.from(new Set(values.flat().map((value) => String(value || '')).filter(Boolean)));
}

async function groupedCounts(modelNames: string[], userIds: unknown[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  await Promise.all(modelNames.map(async (modelName) => {
    const model = db[modelName];
    if (!model?.aggregate) return;
    const rows = await model.aggregate([
      { $match: { createUserId: { $in: userIds } } },
      { $group: { _id: '$createUserId', count: { $sum: 1 } } },
    ]);
    rows.forEach((row) => {
      const key = String(row._id || '');
      result.set(key, (result.get(key) || 0) + Number(row.count || 0));
    });
  }));
  return result;
}

async function adminBlockers(req: WikitruthRequest, users: UserRecord[]): Promise<Record<string, string[]>> {
  const result: Record<string, string[]> = {};
  const currentActor = actorId(req);
  const activeAdmins = await db.User.countDocuments({ 'roles.admin': { $ne: null }, isActive: 'yes' });
  users.forEach((user) => {
    const blockers: string[] = [];
    const id = String(user._id || '');
    if (id === currentActor) blockers.push('You cannot restrict your own account.');
    if (String(user.username || '').toLowerCase() === 'root') blockers.push('The root account is protected.');
    if (user.roles?.admin && activeAdmins <= 1) blockers.push('The last active administrator cannot be restricted.');
    if (blockers.length) result[id] = blockers;
  });
  return result;
}

async function securitySummary(userIds: unknown[]): Promise<{
  sessions: Map<string, GroupRow>;
  passkeys: Map<string, GroupRow>;
  apiClients: Map<string, GroupRow>;
}> {
  const now = new Date();
  const group = (field: string) => ({ $group: { _id: field, count: { $sum: 1 }, lastSeen: { $max: '$lastActivityAt' } } });
  const [sessions, passkeys, apiClients] = await Promise.all([
    db.WebSession.aggregate([{ $match: { userId: { $in: userIds }, revokedAt: null, absoluteExpiresAt: { $gt: now } } }, group('$userId')]),
    db.PasskeyCredential.aggregate([{ $match: { userId: { $in: userIds }, status: 'active' } }, { $group: { _id: '$userId', count: { $sum: 1 }, lastSeen: { $max: '$lastUsedAt' } } }]),
    db.ApiClient.aggregate([{ $match: { userId: { $in: userIds }, status: 'active' } }, { $group: { _id: '$userId', count: { $sum: 1 }, lastSeen: { $max: '$lastUsedAt' } } }]),
  ]);
  return {
    sessions: new Map(sessions.map((row) => [String(row._id), row])),
    passkeys: new Map(passkeys.map((row) => [String(row._id), row])),
    apiClients: new Map(apiClients.map((row) => [String(row._id), row])),
  };
}

export function registerAdminPeopleRoutes(router: Router, ensureAdmin: EnsureAdmin): void {
  router.get('/people', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res)) return;
    const page = intValue(req.query.page, 1, 1_000_000);
    const limit = intValue(req.query.limit, 25, MAX_PAGE_SIZE);
    const q = String(req.query.q || '').trim().slice(0, 100);
    const state = String(req.query.state || '').trim();
    const verification = String(req.query.verification || '').trim();
    const activity = String(req.query.activity || '').trim();
    const role = String(req.query.role || '').trim();
    const risk = String(req.query.risk || '').trim();
    const createdDays = intValue(req.query.createdDays, 0, 36500);
    const criteria: Record<string, unknown> = {};
    const clauses: Record<string, unknown>[] = [];

    if (q) clauses.push({ $or: [{ username: escapedRegex(q) }, { email: escapedRegex(q) }, { search: escapedRegex(q) }] });
    if (state === 'active') clauses.push({ $or: [{ 'adminOperations.state': 'active' }, { 'adminOperations.state': { $exists: false }, isActive: 'yes' }] });
    else if (state) clauses.push({ 'adminOperations.state': state });
    if (role && ['admin', 'account', 'reviewer', 'screener'].includes(role)) clauses.push({ [`roles.${role}`]: { $nin: [null, false, ''] } });
    if (createdDays > 0) clauses.push({ timeCreated: { $gte: new Date(Date.now() - createdDays * 86400000) } });

    const needsActivityIds = activity || risk === 'likely_spam';
    const activeCreatorIds = needsActivityIds ? await activityUserIds() : [];
    if (activity === 'any') clauses.push({ _id: { $in: activeCreatorIds } });
    if (activity === 'none' || risk === 'likely_spam') clauses.push({ _id: { $nin: activeCreatorIds } });

    if (verification || risk === 'likely_spam') {
      const verifiedValue = verification === 'verified' ? 'yes' : { $ne: 'yes' };
      const accounts = await db.Account.find({ isVerified: verifiedValue }).select('_id').lean();
      const accountIds = accounts.map((account) => account._id);
      clauses.push({ 'roles.account': { $in: accountIds } });
    }
    if (risk === 'likely_spam') clauses.push({ 'roles.admin': { $in: [null, false, ''] } });
    if (clauses.length) criteria.$and = clauses;

    const [users, total, allActivityIds, summaryStates, recentlyJoined] = await Promise.all([
      db.User.find(criteria).sort({ timeCreated: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      db.User.countDocuments(criteria),
      needsActivityIds ? Promise.resolve(activeCreatorIds) : activityUserIds(),
      Promise.all([
        db.User.countDocuments({ 'adminOperations.state': 'needs_review' }),
        db.User.countDocuments({ 'adminOperations.state': 'quarantined' }),
      ]),
      db.User.countDocuments({ timeCreated: { $gte: new Date(Date.now() - 30 * 86400000) } }),
    ]);
    const userIds = users.map((user) => user._id);
    const accountIds = users.map((user) => user.roles?.account).filter(Boolean) as unknown[];
    const [accounts, content, security] = await Promise.all([
      accountIds.length ? db.Account.find({ _id: { $in: accountIds } }).lean() : Promise.resolve([]),
      groupedCounts(CONTENT_MODELS, userIds),
      securitySummary(userIds),
    ]);
    const accountMap = new Map(accounts.map((account) => [String(account._id), account]));
    const activeSet = new Set(allActivityIds);

    const items = users.map((user) => {
      const id = String(user._id);
      const account = accountMap.get(String(user.roles?.account || ''));
      const contributionCount = content.get(id) || 0;
      const lastSeen = security.sessions.get(id)?.lastSeen || security.apiClients.get(id)?.lastSeen || null;
      const signals = [
        ...(account?.isVerified === 'yes' ? [] : ['unverified']),
        ...(contributionCount === 0 ? ['no_activity'] : []),
        ...(user.timeCreated && Date.now() - new Date(user.timeCreated).getTime() < 30 * 86400000 ? ['recently_joined'] : []),
      ];
      return {
        id,
        username: user.username || '',
        email: user.email || '',
        name: account?.name?.full || '',
        state: operationState(user),
        reason: String(user.adminOperations?.reason || ''),
        verified: account?.isVerified === 'yes',
        roles: user.roles || {},
        timeCreated: user.timeCreated || null,
        contributionCount,
        activeSessions: security.sessions.get(id)?.count || 0,
        activePasskeys: security.passkeys.get(id)?.count || 0,
        activeApiClients: security.apiClients.get(id)?.count || 0,
        lastSeen,
        signals,
        canUndo: Boolean(user.adminOperations?.undoUntil && new Date(String(user.adminOperations.undoUntil)) > new Date()),
      };
    });

    res.json({
      success: true,
      items,
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
      summary: {
        needsReview: summaryStates[0],
        quarantined: summaryStates[1],
        noActivity: await db.User.countDocuments({ _id: { $nin: Array.from(activeSet) } }),
        recentlyJoined,
      },
      filters: { q, state, verification, activity, role, risk, createdDays },
    });
  });

  router.post('/people/actions/preview', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res)) return;
    const ids = Array.from(new Set((Array.isArray(req.body?.ids) ? req.body.ids : []).map((id: unknown) => String(id || '').trim()).filter(Boolean))).slice(0, 100);
    const action = String(req.body?.action || '').trim();
    if (!ids.length || !['quarantine', 'deactivate', 'restore', 'revoke_sessions'].includes(action)) {
      res.status(400).json({ success: false, message: 'Select accounts and a supported action.' });
      return;
    }
    const users = await db.User.find({ _id: { $in: ids } }).select('_id username email roles isActive adminOperations').lean();
    const blockers = action === 'restore' || action === 'revoke_sessions' ? {} : await adminBlockers(req, users);
    const security = await securitySummary(users.map((user) => user._id));
    const contributions = await groupedCounts(CONTENT_MODELS, users.map((user) => user._id));
    const payload = { ids: users.map((user) => String(user._id)), action, actorId: actorId(req), expiresAt: Date.now() + PREVIEW_TTL_MS };
    res.json({
      success: true,
      previewToken: previewToken(req, payload),
      expiresAt: new Date(Number(payload.expiresAt)).toISOString(),
      action,
      targets: users.map((user) => ({
        id: String(user._id), username: user.username || '', email: user.email || '',
        activeSessions: security.sessions.get(String(user._id))?.count || 0,
        retainedContributions: contributions.get(String(user._id)) || 0,
        blockers: blockers[String(user._id)] || [],
      })),
      blockerCount: Object.values(blockers).flat().length,
    });
  });

  router.post('/people/actions', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res)) return;
    const token = verifyPreviewToken(req, String(req.body?.previewToken || ''));
    const reason = String(req.body?.reason || '').trim().slice(0, 500);
    const ids = Array.isArray(token?.ids) ? token.ids.map((id) => String(id)) : [];
    const action = String(token?.action || '');
    if (!token || token.actorId !== actorId(req) || !ids.length) {
      res.status(400).json({ success: false, message: 'The action preview expired or is invalid. Preview again.' });
      return;
    }
    if (action !== 'restore' && action !== 'revoke_sessions' && !reason) {
      res.status(400).json({ success: false, message: 'A reason is required.' });
      return;
    }
    const users = await db.User.find({ _id: { $in: ids } }).select('_id username roles isActive adminOperations mobileTokens').lean();
    const blockers = action === 'restore' || action === 'revoke_sessions' ? {} : await adminBlockers(req, users);
    if (Object.keys(blockers).length) {
      res.status(409).json({ success: false, message: 'One or more accounts are protected.', blockers });
      return;
    }
    const now = new Date();
    const actionId = randomUUID();
    let revokedSessions = 0;
    if (action === 'revoke_sessions') {
      const result = await db.WebSession.updateMany({ userId: { $in: ids }, revokedAt: null }, { $set: { revokedAt: now, revokedReason: reason || 'admin_revoked' } });
      revokedSessions = Number(result.modifiedCount || 0);
    } else if (action === 'restore') {
      await db.User.updateMany(
        { _id: { $in: ids }, 'adminOperations.undoUntil': { $gt: now } },
        { $set: { isActive: 'yes', 'adminOperations.state': 'active', 'adminOperations.reason': reason || 'Restored by administrator', 'adminOperations.changedAt': now, 'adminOperations.changedByUserId': actorId(req), 'adminOperations.actionId': actionId, 'adminOperations.undoUntil': null } },
      );
    } else {
      const state = action === 'quarantine' ? 'quarantined' : 'deactivated';
      await Promise.all(users.map((user) => db.User.updateMany(
        { _id: user._id },
        { $set: { isActive: 'no', 'adminOperations.state': state, 'adminOperations.reason': reason, 'adminOperations.changedAt': now, 'adminOperations.changedByUserId': actorId(req), 'adminOperations.actionId': actionId, 'adminOperations.previousState': operationState(user), 'adminOperations.previousIsActive': user.isActive || 'yes', 'adminOperations.undoUntil': new Date(now.getTime() + UNDO_TTL_MS) } },
      )));
      const result = await db.WebSession.updateMany({ userId: { $in: ids }, revokedAt: null }, { $set: { revokedAt: now, revokedReason: `admin_${state}` } });
      revokedSessions = Number(result.modifiedCount || 0);
      await db.ApiClient.updateMany({ userId: { $in: ids }, status: 'active' }, { $set: { status: 'revoked', revokedAt: now, revokedByUserId: actorId(req), editDate: now } });
    }

    await logEntryEvent({
      scope: 'privileged', eventType: `admin.people.${action}`, objectType: constants.OBJECT_TYPES.user,
      objectName: 'user', objectId: String(ids[0]), actorUserId: actorId(req), actorUsername: String(req.user?.username || ''),
      message: `Administrator executed ${action} for ${ids.length} account(s)`,
      payload: { actionId, targetUserIds: ids, reason, revokedSessions, contentRetained: true },
    });
    res.json({ success: true, action, actionId, affected: ids.length, revokedSessions, undoUntil: ['quarantine', 'deactivate'].includes(action) ? new Date(now.getTime() + UNDO_TTL_MS).toISOString() : null });
  });

  router.get('/users/:id/security', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res)) return;
    const user = await db.User.findById(String(req.params.id || '')).select('_id username email roles isActive passwordLoginDisabled adminOperations securityOperations mobileTokens').lean();
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const [security, recovery, accountRows] = await Promise.all([
      securitySummary([user._id]),
      db.RecoveryCodeSet.findOne({ userId: user._id }).select('codes createDate editDate').lean(),
      user.roles?.account ? db.Account.find({ _id: user.roles.account }).lean() : Promise.resolve([]),
    ]);
    const id = String(user._id);
    const unusedRecoveryCodes = Array.isArray(recovery?.codes)
      ? recovery.codes.filter((code) => code && typeof code === 'object' && !(code as Record<string, unknown>).usedAt).length
      : 0;
    res.json({
      success: true,
      security: {
        user: { id, username: user.username || '', email: user.email || '', state: operationState(user), isActive: user.isActive === 'yes', passwordLoginDisabled: Boolean(user.passwordLoginDisabled) },
        activeSessions: security.sessions.get(id)?.count || 0,
        lastSeen: security.sessions.get(id)?.lastSeen || security.apiClients.get(id)?.lastSeen || null,
        activePasskeys: security.passkeys.get(id)?.count || 0,
        activeApiClients: security.apiClients.get(id)?.count || 0,
        unusedRecoveryCodes,
        verified: accountRows[0]?.isVerified === 'yes',
        locked: Boolean(user.securityOperations?.lockedAt),
      },
    });
  });

  router.post('/users/:id/security', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res)) return;
    const action = String(req.body?.action || '').trim();
    const reason = String(req.body?.reason || '').trim().slice(0, 500);
    const user = await db.User.findById(String(req.params.id || '')).select('_id username roles isActive passwordLoginDisabled adminOperations securityOperations').lean();
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    if (['lock', 'disable_password'].includes(action)) {
      const blockers = await adminBlockers(req, [user]);
      if (Object.keys(blockers).length) {
        res.status(409).json({ success: false, message: Object.values(blockers).flat()[0] });
        return;
      }
    }
    const now = new Date();
    if (action === 'revoke_sessions') {
      const result = await db.WebSession.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: now, revokedReason: reason || 'admin_revoked' } });
      res.json({ success: true, revokedSessions: Number(result.modifiedCount || 0) });
      return;
    }
    if (action === 'disable_password') {
      const security = await securitySummary([user._id]);
      const recovery = await db.RecoveryCodeSet.findOne({ userId: user._id }).select('codes').lean();
      const unusedCodes = Array.isArray(recovery?.codes) ? recovery.codes.filter((code) => !(code as Record<string, unknown>).usedAt).length : 0;
      if ((security.passkeys.get(String(user._id))?.count || 0) < 2 || unusedCodes < 1) {
        res.status(409).json({ success: false, message: 'Password sign-in can be disabled only after two active passkeys and unused recovery codes exist.' });
        return;
      }
      await db.User.updateMany({ _id: user._id }, { $set: { passwordLoginDisabled: true } });
    } else if (action === 'enable_password') {
      await db.User.updateMany({ _id: user._id }, { $set: { passwordLoginDisabled: false } });
    } else if (action === 'lock') {
      if (!reason) {
        res.status(400).json({ success: false, message: 'A lock reason is required.' });
        return;
      }
      await db.User.updateMany({ _id: user._id }, { $set: { isActive: 'no', 'securityOperations.lockedAt': now, 'securityOperations.lockedReason': reason, 'securityOperations.lockedByUserId': actorId(req) } });
      await db.WebSession.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: now, revokedReason: 'admin_locked' } });
    } else if (action === 'unlock') {
      await db.User.updateMany({ _id: user._id }, { $set: { isActive: 'yes', 'securityOperations.lockedAt': null, 'securityOperations.lockedReason': '', 'securityOperations.lockedByUserId': null } });
    } else if (action === 'verify' || action === 'unverify') {
      if (!user.roles?.account) {
        res.status(409).json({ success: false, message: 'This user has no linked account record.' });
        return;
      }
      await db.Account.updateOne({ _id: user.roles.account }, { $set: { isVerified: action === 'verify' ? 'yes' : 'no' } });
    } else {
      res.status(400).json({ success: false, message: 'Unsupported security action.' });
      return;
    }
    await logEntryEvent({
      scope: 'privileged', eventType: `admin.user.security.${action}`, objectType: constants.OBJECT_TYPES.user,
      objectName: 'user', objectId: String(user._id), actorUserId: actorId(req), actorUsername: String(req.user?.username || ''),
      message: `Administrator executed ${action} for user account`, payload: { reason },
    });
    res.json({ success: true, action });
  });
}
