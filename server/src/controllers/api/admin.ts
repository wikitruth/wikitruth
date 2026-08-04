'use strict';

import type { Router } from 'express';
import type { WikitruthNext, WikitruthRequest, WikitruthResponse } from '../../types/http';
import {
  bodyOf,
  type AdminAccountNoteBodyContract,
  type AdminAccountStatusBodyContract,
  type AdminCreateUserBodyContract,
  type AdminPermissionsBodyContract,
  type AdminRoleBindingBodyContract,
  type AdminRoleMutationBodyContract,
  type AdminSetPasswordBodyContract,
} from '../../types/controllerContracts';

import appModForDb from '../../app';
import constants from '../../models/constants';
const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;
import type { SystemHealthConnection, SystemHealthModels } from '../../services/adminSystemHealthService';
const adminDatabaseConnection = (appModForDb as unknown as { db: SystemHealthConnection }).db;
import { registerAdminBackupRoutes } from './adminBackupRoutes';
import { logEntryEvent } from '../../services/entryEventsService';
import { registerAdminApiClientRoutes } from './adminApiClientRoutes';
import { registerAdminCollectionRoutes, type AdminCollectionModels } from './adminCollectionRoutes';
import { registerAdminAccessRoutes } from './adminAccessRoutes';
import { requirePrivilegedPasskeyAssurance } from '../../services/privilegedAuthService';
import { registerAdminEmailOperationsRoutes } from './adminEmailOperationsRoutes';
import { registerAdminPeopleRoutes } from './adminPeopleRoutes';
import { registerAdminOperationalRoutes } from './adminOperationalRoutes';
import { registerAdminPrivacyRoutes } from './adminPrivacyRoutes';
import {
  ADMIN_PERMISSIONS,
  type AuthorizationModels,
  buildAdminAuthorization,
  permissionForAdminRequest,
  resolveAdminAuthorization,
} from '../../services/adminAuthorizationService';
import {
  type AdminAccessModels,
  normalizeGroupIds,
  normalizePermissionRows,
  preservesCapableAdministrator,
} from '../../services/adminAccessService';
import { buildAdminSystemHealth } from '../../services/adminSystemHealthService';
import { captureHealthSnapshot } from '../../services/operationalTelemetryService';
import * as flowUtils from '../../utils/flowUtils';

function ensureAdmin(req: WikitruthRequest, res: WikitruthResponse): boolean {
  if (!req.user || !req.user.canPlayRoleOf || !req.user.canPlayRoleOf('admin')) {
    res.status(403).json({ success: false, message: 'Admin privileges required' });
    return false;
  }

  return true;
}

function sanitizeMutationPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const nextPayload = { ...payload };
  delete nextPayload._id;
  delete nextPayload.id;
  delete nextPayload.__v;
  delete nextPayload.password;
  delete nextPayload.resetPasswordToken;
  delete nextPayload.resetPasswordExpires;
  delete nextPayload.mobileTokens;
  return nextPayload;
}

const ADMIN_USER_RESPONSE_FIELDS = [
  '_id',
  'username',
  'email',
  'roles',
  'onboarding',
  'isActive',
  'timeCreated',
  'passwordLoginDisabled',
  'adminOperations',
  'securityOperations',
  'preferences',
] as const;

function sanitizeAdminUser(user: unknown): Record<string, unknown> | null {
  if (!user || typeof user !== 'object') {
    return null;
  }

  const source = user as Record<string, unknown>;
  return Object.fromEntries(
    ADMIN_USER_RESPONSE_FIELDS
      .filter((field) => typeof source[field] !== 'undefined')
      .map((field) => [field, source[field]]),
  );
}

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  }
  return Boolean(value);
}

function encryptPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    db.User.encryptPassword(password, function (err: unknown, hash?: string) {
      if (err) {
        reject(err);
        return;
      }
      if (!hash) {
        reject(new Error('Password hashing failed'));
        return;
      }
      resolve(hash);
    });
  });
}

async function adminIdentityBlocker(
  req: WikitruthRequest,
  user: Record<string, unknown> | null,
): Promise<string | null> {
  if (!user) return null;
  const targetId = String(user._id || '');
  const targetUsername = String(user.username || '').trim().toLowerCase();
  const roles = user.roles && typeof user.roles === 'object'
    ? user.roles as Record<string, unknown>
    : {};
  if (targetId && targetId === String(req.user?._id || req.user?.id || '')) {
    return 'You cannot remove or restrict your own administrator identity.';
  }
  if (targetUsername === 'root') {
    return 'The root administrator identity is protected.';
  }
  if (roles.admin) {
    const activeAdminCount = await db.User.countDocuments({
      'roles.admin': { $ne: null },
      isActive: 'yes',
    });
    if (activeAdminCount <= 1) return 'The last active administrator cannot be removed or restricted.';
  }
  return null;
}

export = function (router: Router) {
  router.use(async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    if (!ensureAdmin(req, res)) return;
    const user = req.user as unknown as Record<string, unknown>;
    const roles = user?.roles && typeof user.roles === 'object' ? user.roles as Record<string, unknown> : null;
    const authorization = roles?.admin
      ? await resolveAdminAuthorization(user, db as unknown as AuthorizationModels)
      : buildAdminAuthorization({ _id: 'legacy-admin', permissions: [] }, []);
    if (!authorization) {
      res.status(403).json({ success: false, message: 'Administrator record is unavailable' });
      return;
    }
    const permission = permissionForAdminRequest(
      req.method,
      req.path,
      (req.body || {}) as Record<string, unknown>,
    );
    if (!authorization.can(permission)) {
      res.status(403).json({
        success: false,
        message: `Administrator permission required: ${permission}`,
        requiredPermission: permission,
      });
      return;
    }
    res.locals.adminAuthorization = {
      adminId: authorization.adminId,
      effectivePermissions: authorization.effectivePermissions,
      legacySuperAdmin: authorization.legacySuperAdmin,
    };
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
      && !(await requirePrivilegedPasskeyAssurance(req, res))) return;
    next();
  });
  registerAdminApiClientRoutes(router, ensureAdmin);
  registerAdminEmailOperationsRoutes(router, ensureAdmin);
  registerAdminPeopleRoutes(router, ensureAdmin);
  registerAdminOperationalRoutes(router, ensureAdmin);
  registerAdminPrivacyRoutes(router, ensureAdmin);
  router.get('/', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const [users, accounts, categories, statuses, administrators, groups, quarantined, emailQueued, emailFailed, notificationFailed] = await Promise.all([
      db.User.countDocuments(),
      db.Account.countDocuments(),
      db.Category.countDocuments(),
      db.Status.countDocuments(),
      db.Admin.countDocuments(),
      db.Group.countDocuments(),
      db.User.countDocuments({ 'adminOperations.state': 'quarantined' }),
      db.EmailOutbox?.countDocuments ? db.EmailOutbox.countDocuments({ status: 'queued' }) : Promise.resolve(0),
      db.EmailOutbox?.countDocuments ? db.EmailOutbox.countDocuments({ status: 'failed' }) : Promise.resolve(0),
      db.NotificationOutbox?.countDocuments ? db.NotificationOutbox.countDocuments({ status: 'failed' }) : Promise.resolve(0),
    ]);

    res.json({
      success: true,
      counts: { users, accounts, categories, statuses, administrators, groups },
      queues: { quarantined, emailQueued, emailFailed, notificationFailed },
      authorization: res.locals.adminAuthorization,
      permissionCatalog: ADMIN_PERMISSIONS,
    });
  });

  router.get('/system-health', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) return;
    const health = await buildAdminSystemHealth({
      connection: adminDatabaseConnection,
      models: db as unknown as SystemHealthModels,
      backupRoot: flowUtils.getBackupDir(),
    });
    await captureHealthSnapshot(health).catch(() => undefined);
    res.json({ success: true, health });
  });
  registerAdminCollectionRoutes(router, ensureAdmin, db as unknown as AdminCollectionModels, sanitizeAdminUser);
  registerAdminAccessRoutes(router, ensureAdmin, db as unknown as AdminAccessModels & any);

  router.post('/users', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const body = bodyOf<AdminCreateUserBodyContract>(req);
    const username = String(body.username || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '').trim();

    if (!username || !email || !password) {
      res.status(400).json({ success: false, message: 'username, email and password are required' });
      return;
    }

    const [existingUser, existingEmail] = await Promise.all([
      db.User.findOne({ username: username }).lean(),
      db.User.findOne({ email: email }).lean(),
    ]);
    if (existingUser) {
      res.status(409).json({ success: false, message: 'Username already exists' });
      return;
    }
    if (existingEmail) {
      res.status(409).json({ success: false, message: 'Email already exists' });
      return;
    }

    const passwordHash = await encryptPassword(password);
    const user = await db.User.create({
      username: username,
      email: email,
      password: passwordHash,
      isActive: 'yes',
      roles: {
        screener: toBoolean(body.roles?.screener),
        reviewer: toBoolean(body.roles?.reviewer),
      },
      onboarding: {
        contributor: { completed: false },
        reviewer: { completed: false, assignedDate: toBoolean(body.roles?.reviewer) ? new Date() : null },
      },
      search: [username, email],
    });

    res.status(201).json({
      success: true,
      user: sanitizeAdminUser(await db.User.findById(user._id).lean()),
    });
  });

  router.put('/users/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const payload = sanitizeMutationPayload((req.body || {}) as Record<string, unknown>);
    const user = await db.User.findByIdAndUpdate(req.params.id, payload, { new: true }).lean();
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, user: sanitizeAdminUser(user) });
  });

  router.delete('/users/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const user = await db.User.findById(req.params.id).lean();
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const blocker = await adminIdentityBlocker(req, user as Record<string, unknown>);
    if (blocker) {
      res.status(409).json({ success: false, message: blocker });
      return;
    }
    const confirmText = String(req.body?.confirmText || '').trim();
    if (confirmText !== `DELETE ${String(user.username || '')}`) {
      res.status(400).json({
        success: false,
        message: `Permanent deletion requires the exact phrase DELETE ${String(user.username || '')}. Prefer quarantine when content must be retained.`,
      });
      return;
    }
    const contributionModels = ['Topic', 'Argument', 'Question', 'Answer', 'Issue', 'Opinion', 'Artifact'];
    const contributionCounts = await Promise.all(contributionModels.map((modelName) => (
      db[modelName]?.countDocuments
        ? db[modelName].countDocuments({ createUserId: user._id })
        : Promise.resolve(0)
    )));
    if (contributionCounts.some((count) => Number(count) > 0)) {
      res.status(409).json({
        success: false,
        message: 'This account owns retained contributions and cannot be permanently deleted. Quarantine it instead.',
      });
      return;
    }
    await db.User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  });

  router.put('/users/:id/password', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const body = bodyOf<AdminSetPasswordBodyContract>(req);
    const password = String(body.password || body.newPassword || '').trim();
    if (!password || password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      return;
    }

    const passwordHash = await encryptPassword(password);
    const user = await db.User.findByIdAndUpdate(req.params.id, { password: passwordHash }, { new: true }).lean();
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, user: sanitizeAdminUser(user) });
  });

  router.put('/users/:id/role-admin', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const body = bodyOf<AdminRoleBindingBodyContract>(req);
    const adminId = String(body.adminId || '').trim();
    if (!adminId) {
      res.status(400).json({ success: false, message: 'adminId is required' });
      return;
    }

    const [user, admin] = await Promise.all([
      db.User.findById(req.params.id),
      db.Admin.findById(adminId),
    ]);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    if (!admin) {
      res.status(404).json({ success: false, message: 'Admin record not found' });
      return;
    }

    if (!user.roles) {
      user.roles = {};
    }
    user.roles.admin = admin._id;
    await user.save();

    admin.user = {
      id: user._id,
      name: user.username,
    };
    await admin.save();

    res.json({ success: true, user: sanitizeAdminUser(await db.User.findById(user._id).lean()) });
  });

  router.delete('/users/:id/role-admin', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const user = await db.User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const blocker = await adminIdentityBlocker(req, user.toObject ? user.toObject() : user);
    if (blocker) {
      res.status(409).json({ success: false, message: blocker });
      return;
    }

    const adminId = String(user.roles?.admin || '');
    if (adminId) {
      const admin = await db.Admin.findById(adminId);
      if (admin) {
        admin.user = { id: null, name: '' };
        await admin.save();
      }
    }

    if (!user.roles) {
      user.roles = {};
    }
    user.roles.admin = null;
    await user.save();

    res.json({ success: true, user: sanitizeAdminUser(await db.User.findById(user._id).lean()) });
  });

  router.put('/users/:id/role-account', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const body = bodyOf<AdminRoleBindingBodyContract>(req);
    const accountId = String(body.accountId || '').trim();
    if (!accountId) {
      res.status(400).json({ success: false, message: 'accountId is required' });
      return;
    }

    const [user, account] = await Promise.all([
      db.User.findById(req.params.id),
      db.Account.findById(accountId),
    ]);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    if (!account) {
      res.status(404).json({ success: false, message: 'Account record not found' });
      return;
    }

    if (!user.roles) {
      user.roles = {};
    }
    user.roles.account = account._id;
    await user.save();

    account.user = {
      id: user._id,
      name: user.username,
    };
    await account.save();

    res.json({ success: true, user: sanitizeAdminUser(await db.User.findById(user._id).lean()) });
  });

  router.delete('/users/:id/role-account', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const user = await db.User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const accountId = String(user.roles?.account || '');
    if (accountId) {
      const account = await db.Account.findById(accountId);
      if (account) {
        account.user = { id: null, name: '' };
        await account.save();
      }
    }

    if (!user.roles) {
      user.roles = {};
    }
    user.roles.account = null;
    await user.save();

    res.json({ success: true, user: sanitizeAdminUser(await db.User.findById(user._id).lean()) });
  });

  router.put('/users/:id/roles', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const body = bodyOf<AdminRoleMutationBodyContract>(req);
    const user = await db.User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (!user.roles) {
      user.roles = {};
    }
    user.roles.screener = toBoolean(body.screener ?? body.roles?.screener);
    const wasReviewer = Boolean(user.roles.reviewer);
    const isReviewer = toBoolean(body.reviewer ?? body.roles?.reviewer);
    user.roles.reviewer = isReviewer;
    if (isReviewer && !wasReviewer) {
      user.onboarding = user.onboarding || {};
      user.onboarding.reviewer = {
        completed: false,
        policyVersion: '',
        acknowledgements: [],
        completedDate: null,
        completedUserId: null,
        assignedDate: new Date(),
      };
    }
    await user.save();

    await logEntryEvent({
      scope: 'privileged',
      eventType: 'admin.user.roles.updated',
      objectType: constants.OBJECT_TYPES.user,
      objectName: 'user',
      objectId: String(user._id),
      actorUserId: String(req.user?.id || req.user?._id || ''),
      actorUsername: String(req.user?.username || ''),
      message: 'User screening/reviewer roles updated',
      payload: {
        screener: Boolean(user.roles.screener),
        reviewer: isReviewer,
        reviewerOnboardingReset: isReviewer && !wasReviewer,
      },
    });

    res.json({ success: true, user: sanitizeAdminUser(await db.User.findById(user._id).lean()) });
  });

  router.put('/accounts/:id/user', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const body = bodyOf<AdminRoleBindingBodyContract>(req);
    const userId = String(body.userId || '').trim();
    if (!userId) {
      res.status(400).json({ success: false, message: 'userId is required' });
      return;
    }

    const [account, user] = await Promise.all([
      db.Account.findById(req.params.id),
      db.User.findById(userId),
    ]);
    if (!account) {
      res.status(404).json({ success: false, message: 'Account not found' });
      return;
    }
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    account.user = {
      id: user._id,
      name: user.username,
    };
    await account.save();

    if (!user.roles) {
      user.roles = {};
    }
    user.roles.account = account._id;
    await user.save();

    res.json({ success: true, account: await db.Account.findById(account._id).lean() });
  });

  router.delete('/accounts/:id/user', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const account = await db.Account.findById(req.params.id);
    if (!account) {
      res.status(404).json({ success: false, message: 'Account not found' });
      return;
    }

    const linkedUserId = String(account.user?.id || '');
    if (linkedUserId) {
      const user = await db.User.findById(linkedUserId);
      if (user?.roles) {
        user.roles.account = null;
        await user.save();
      }
    }

    account.user = { id: null, name: '' };
    await account.save();

    res.json({ success: true, account: await db.Account.findById(account._id).lean() });
  });

  router.post('/accounts/:id/notes', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const account = await db.Account.findById(req.params.id);
    if (!account) {
      res.status(404).json({ success: false, message: 'Account not found' });
      return;
    }

    const body = bodyOf<AdminAccountNoteBodyContract>(req);
    const data = String(body.data || body.note || '').trim();
    if (!data) {
      res.status(400).json({ success: false, message: 'note data is required' });
      return;
    }

    const userCreated = {
      id: req.user?._id || req.user?.id || null,
      name: req.user?.username || '',
      time: new Date(),
    };
    const notes = Array.isArray(account.notes) ? account.notes : [];
    notes.push({ data, userCreated });
    account.notes = notes;
    await account.save();

    res.status(201).json({ success: true, account: await db.Account.findById(account._id).lean() });
  });

  router.post('/accounts/:id/status', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const account = await db.Account.findById(req.params.id);
    if (!account) {
      res.status(404).json({ success: false, message: 'Account not found' });
      return;
    }

    const body = bodyOf<AdminAccountStatusBodyContract>(req);
    const statusId = String(body.statusId || body.id || '').trim();
    if (!statusId) {
      res.status(400).json({ success: false, message: 'statusId is required' });
      return;
    }

    const status = await db.Status.findById(statusId).lean();
    if (!status) {
      res.status(404).json({ success: false, message: 'Status not found' });
      return;
    }

    const userCreated = {
      id: req.user?._id || req.user?.id || null,
      name: req.user?.username || '',
      time: new Date(),
    };

    account.status = {
      id: status._id,
      name: status.name,
      userCreated,
    };
    const statusLog = Array.isArray(account.statusLog) ? account.statusLog : [];
    statusLog.push({
      id: status._id,
      name: status.name,
      userCreated,
    });
    account.statusLog = statusLog;
    await account.save();

    res.status(201).json({ success: true, account: await db.Account.findById(account._id).lean() });
  });

  router.put('/administrators/:id/permissions', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const admin = await db.Admin.findById(req.params.id);
    if (!admin) {
      res.status(404).json({ success: false, message: 'Administrator not found' });
      return;
    }

    const linkedUserId = String(admin.user?.id || '');
    if (linkedUserId === String(req.user?._id || req.user?.id || '')) {
      res.status(409).json({ success: false, message: 'You cannot change your own administrator permissions.' });
      return;
    }

    const body = bodyOf<AdminPermissionsBodyContract>(req);
    let permissions;
    try {
      permissions = normalizePermissionRows(body.permissions);
    } catch (error) {
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Invalid permissions' });
      return;
    }
    const assignedGroups = await db.AdminGroup.find({ _id: { $in: (admin.groups || []).map(String) } }).lean();
    if (buildAdminAuthorization({ _id: admin._id, permissions, groups: admin.groups || [] }, assignedGroups).legacySuperAdmin) {
      res.status(400).json({ success: false, message: 'This change would create the legacy full-access fallback. Use an explicit permission or group grant.' });
      return;
    }
    const safe = await preservesCapableAdministrator(db as unknown as AdminAccessModels, {
      admin: {
        id: String(admin._id),
        permissions,
        groups: (admin.groups || []).map(String),
      },
    });
    if (!safe) {
      res.status(409).json({ success: false, message: 'This change would remove the last active security administrator.' });
      return;
    }
    admin.permissions = permissions;
    await admin.save();
    await logEntryEvent({
      scope: 'privileged', eventType: 'admin.permissions.updated', objectType: constants.OBJECT_TYPES.user,
      objectName: 'administrator-access', objectId: String(admin._id),
      actorUserId: String(req.user?._id || req.user?.id || ''), actorUsername: String(req.user?.username || ''),
      message: 'Administrator direct permissions updated', payload: { administratorId: String(admin._id), permissions },
    });
    res.json({ success: true, admin: await db.Admin.findById(admin._id).lean() });
  });

  router.put('/administrators/:id/groups', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const admin = await db.Admin.findById(req.params.id);
    if (!admin) {
      res.status(404).json({ success: false, message: 'Administrator not found' });
      return;
    }

    if (String(admin.user?.id || '') === String(req.user?._id || req.user?.id || '')) {
      res.status(409).json({ success: false, message: 'You cannot change your own administrator groups.' });
      return;
    }
    const body = bodyOf<AdminPermissionsBodyContract>(req);
    const allGroups = await db.AdminGroup.find({}).lean();
    let groups;
    try {
      groups = normalizeGroupIds(body.groups, allGroups.map((group: { _id?: unknown }) => String(group._id || '')));
    } catch (error) {
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Invalid groups' });
      return;
    }
    const permissions = normalizePermissionRows((admin.permissions || []).map((row: { name?: unknown; permit?: unknown }) => ({
      name: String(row.name || ''), permit: Boolean(row.permit),
    })));
    const assignedGroups = allGroups.filter((group: { _id?: unknown }) => groups.includes(String(group._id || '')));
    if (buildAdminAuthorization({ _id: admin._id, permissions, groups }, assignedGroups).legacySuperAdmin) {
      res.status(400).json({ success: false, message: 'This change would create the legacy full-access fallback. Use an explicit permission or group grant.' });
      return;
    }
    const safe = await preservesCapableAdministrator(db as unknown as AdminAccessModels, {
      admin: { id: String(admin._id), permissions, groups },
    });
    if (!safe) {
      res.status(409).json({ success: false, message: 'This change would remove the last active security administrator.' });
      return;
    }
    admin.groups = groups;
    await admin.save();
    await logEntryEvent({
      scope: 'privileged', eventType: 'admin.groups.updated', objectType: constants.OBJECT_TYPES.user,
      objectName: 'administrator-access', objectId: String(admin._id),
      actorUserId: String(req.user?._id || req.user?.id || ''), actorUsername: String(req.user?.username || ''),
      message: 'Administrator group assignments updated', payload: { administratorId: String(admin._id), groups },
    });
    res.json({ success: true, admin: await db.Admin.findById(admin._id).lean() });
  });

  router.put('/administrators/:id/user', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const body = bodyOf<AdminRoleBindingBodyContract>(req);
    const userId = String(body.userId || '').trim();
    if (!userId) {
      res.status(400).json({ success: false, message: 'userId is required' });
      return;
    }

    const [admin, user] = await Promise.all([
      db.Admin.findById(req.params.id),
      db.User.findById(userId),
    ]);
    if (!admin) {
      res.status(404).json({ success: false, message: 'Administrator not found' });
      return;
    }
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    admin.user = {
      id: user._id,
      name: user.username,
    };
    await admin.save();

    if (!user.roles) {
      user.roles = {};
    }
    user.roles.admin = admin._id;
    await user.save();

    res.json({ success: true, admin: await db.Admin.findById(admin._id).lean() });
  });

  router.delete('/administrators/:id/user', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const admin = await db.Admin.findById(req.params.id);
    if (!admin) {
      res.status(404).json({ success: false, message: 'Administrator not found' });
      return;
    }

    const linkedUserId = String(admin.user?.id || '');
    if (linkedUserId) {
      const user = await db.User.findById(linkedUserId);
      const blocker = await adminIdentityBlocker(req, user?.toObject ? user.toObject() : user);
      if (blocker) {
        res.status(409).json({ success: false, message: blocker });
        return;
      }
      if (user?.roles) {
        user.roles.admin = null;
        await user.save();
      }
    }

    admin.user = { id: null, name: '' };
    await admin.save();
    res.json({ success: true, admin: await db.Admin.findById(admin._id).lean() });
  });

  router.post('/groups', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const payload = sanitizeMutationPayload((req.body || {}) as Record<string, unknown>);
    try {
      payload.permissions = normalizePermissionRows(payload.permissions || []);
      if ((payload.permissions as Array<{ permit: boolean }>).some((row) => !row.permit)) {
        throw new Error('Administrator groups grant permissions and cannot contain direct denies');
      }
    } catch (error) {
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Invalid group permissions' });
      return;
    }
    const group = await db.AdminGroup.create(payload);
    res.status(201).json({ success: true, group });
  });

  router.put('/groups/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const payload = sanitizeMutationPayload((req.body || {}) as Record<string, unknown>);
    if (Object.prototype.hasOwnProperty.call(payload, 'permissions')) {
      res.status(400).json({ success: false, message: 'Use the group access endpoint to change permissions safely.' });
      return;
    }
    const group = await db.AdminGroup.findByIdAndUpdate(req.params.id, payload, { new: true }).lean();
    if (!group) {
      res.status(404).json({ success: false, message: 'Admin group not found' });
      return;
    }

    res.json({ success: true, group });
  });

  router.delete('/groups/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const assignedCount = await db.Admin.countDocuments({ groups: req.params.id });
    if (assignedCount > 0) {
      res.status(409).json({ success: false, message: 'Remove this group from all administrators before deleting it.' });
      return;
    }
    await db.AdminGroup.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  });

  router.post('/categories', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const payload = sanitizeMutationPayload((req.body || {}) as Record<string, unknown>);
    const category = await db.Category.create(payload);
    res.status(201).json({ success: true, category });
  });

  router.put('/categories/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const payload = sanitizeMutationPayload((req.body || {}) as Record<string, unknown>);
    const category = await db.Category.findByIdAndUpdate(req.params.id, payload, { new: true }).lean();
    if (!category) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }

    res.json({ success: true, category });
  });

  router.delete('/categories/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    await db.Category.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  });

  router.post('/statuses', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const payload = sanitizeMutationPayload((req.body || {}) as Record<string, unknown>);
    const status = await db.Status.create(payload);
    res.status(201).json({ success: true, status });
  });

  router.put('/statuses/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const payload = sanitizeMutationPayload((req.body || {}) as Record<string, unknown>);
    const status = await db.Status.findByIdAndUpdate(req.params.id, payload, { new: true }).lean();
    if (!status) {
      res.status(404).json({ success: false, message: 'Status not found' });
      return;
    }

    res.json({ success: true, status });
  });

  router.delete('/statuses/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    await db.Status.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  });

  registerAdminBackupRoutes(router, ensureAdmin);
};
