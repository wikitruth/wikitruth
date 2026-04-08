'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';

const db = require('../../app').db.models;
const fs = require('fs');
const path = require('path');
const backup = require('mongodb-backup-fixed');
const config = require('../../config/config');
const flowUtils = require('../../utils/flowUtils');

function ensureDir(dirPath: string): void {
  if (fs.existsSync(dirPath)) {
    return;
  }
  fs.mkdirSync(dirPath, { recursive: true });
}

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
  return nextPayload;
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

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item || '').trim()).filter(Boolean);
        }
      } catch (_err) {
        // fallback to comma split
      }
    }
    return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function parsePermissions(value: unknown): Array<{ name: string; permit: boolean }> {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }
        const row = entry as { name?: unknown; permit?: unknown };
        const name = String(row.name || '').trim();
        if (!name) {
          return null;
        }
        return { name: name, permit: toBoolean(row.permit) };
      })
      .filter(Boolean) as Array<{ name: string; permit: boolean }>;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsePermissions(parsed);
      }
    } catch (_err) {
      // fallback to comma-separated names with permit=true
    }
    return parseList(trimmed).map((name) => ({ name, permit: true }));
  }

  return [];
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

module.exports = function (router: Router) {
  router.get('/', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const [users, accounts, categories, statuses] = await Promise.all([
      db.User.countDocuments(),
      db.Account.countDocuments(),
      db.Category.countDocuments(),
      db.Status.countDocuments(),
    ]);

    res.json({
      success: true,
      counts: { users, accounts, categories, statuses },
    });
  });

  router.get('/users', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const users = await db.User.find().limit(100).lean();
    res.json(users);
  });

  router.post('/users', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const username = String(req.body?.username || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '').trim();

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
        screener: toBoolean(req.body?.roles?.screener),
        reviewer: toBoolean(req.body?.roles?.reviewer),
      },
      search: [username, email],
    });

    res.status(201).json({
      success: true,
      user: await db.User.findById(user._id).lean(),
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

    res.json({ success: true, user });
  });

  router.delete('/users/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    await db.User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  });

  router.put('/users/:id/password', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const password = String(req.body?.password || req.body?.newPassword || '').trim();
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

    res.json({ success: true, user });
  });

  router.put('/users/:id/role-admin', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const adminId = String(req.body?.adminId || '').trim();
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

    res.json({ success: true, user: await db.User.findById(user._id).lean() });
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

    res.json({ success: true, user: await db.User.findById(user._id).lean() });
  });

  router.put('/users/:id/role-account', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const accountId = String(req.body?.accountId || '').trim();
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

    res.json({ success: true, user: await db.User.findById(user._id).lean() });
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

    res.json({ success: true, user: await db.User.findById(user._id).lean() });
  });

  router.put('/users/:id/roles', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const user = await db.User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (!user.roles) {
      user.roles = {};
    }
    user.roles.screener = toBoolean(req.body?.screener ?? req.body?.roles?.screener);
    user.roles.reviewer = toBoolean(req.body?.reviewer ?? req.body?.roles?.reviewer);
    await user.save();

    res.json({ success: true, user: await db.User.findById(user._id).lean() });
  });

  router.get('/accounts', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const accounts = await db.Account.find().limit(100).lean();
    res.json(accounts);
  });

  router.put('/accounts/:id/user', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const userId = String(req.body?.userId || '').trim();
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

    const data = String(req.body?.data || req.body?.note || '').trim();
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

    const statusId = String(req.body?.statusId || req.body?.id || '').trim();
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

  router.get('/administrators', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const admins = await db.Admin.find().limit(100).lean();
    res.json(admins);
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

    admin.permissions = parsePermissions(req.body?.permissions);
    await admin.save();
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

    admin.groups = parseList(req.body?.groups);
    await admin.save();
    res.json({ success: true, admin: await db.Admin.findById(admin._id).lean() });
  });

  router.put('/administrators/:id/user', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const userId = String(req.body?.userId || '').trim();
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
      if (user?.roles) {
        user.roles.admin = null;
        await user.save();
      }
    }

    admin.user = { id: null, name: '' };
    await admin.save();
    res.json({ success: true, admin: await db.Admin.findById(admin._id).lean() });
  });

  router.get('/groups', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const groups = await db.AdminGroup.find().limit(100).lean();
    res.json(groups);
  });

  router.post('/groups', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const payload = sanitizeMutationPayload((req.body || {}) as Record<string, unknown>);
    const group = await db.AdminGroup.create(payload);
    res.status(201).json({ success: true, group });
  });

  router.put('/groups/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const payload = sanitizeMutationPayload((req.body || {}) as Record<string, unknown>);
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

    await db.AdminGroup.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  });

  router.get('/categories', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const categories = await db.Category.find().limit(100).lean();
    res.json(categories);
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

  router.get('/statuses', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const statuses = await db.Status.find().limit(100).lean();
    res.json(statuses);
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

  router.get('/db-backup', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const backupDir = flowUtils.getBackupDir();
    const privateBackupDir = path.join(flowUtils.getBackupDir(true), 'users');
    const hasGitBackup = Boolean(config.mongodb?.gitBackup);

    res.json({
      success: true,
      backup: {
        backupDir: backupDir,
        privateBackupDir: privateBackupDir,
        hasGitBackup: hasGitBackup,
      },
    });
  });

  router.post('/db-backup', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const action = String(req.body?.action || req.body?.buttonAction || 'backup');
    if (action !== 'backup') {
      res.status(400).json({ success: false, message: 'Only backup action is supported in modern API' });
      return;
    }

    const backupDir = flowUtils.getBackupDir();
    const privateBackupDir = path.join(flowUtils.getBackupDir(true), 'users');
    ensureDir(backupDir);
    ensureDir(privateBackupDir);

    const collections = config.mongodb?.collections || {};

    backup({
      uri: config.mongodb.uri,
      root: backupDir,
      collections: collections.backupList || [],
      parser: 'json',
    });

    backup({
      uri: config.mongodb.uri,
      root: backupDir,
      collections: collections.privateBackupList || [],
      parser: 'json',
      query: { private: false },
    });

    backup({
      uri: config.mongodb.uri,
      root: privateBackupDir,
      collections: collections.privateBackupList || [],
      parser: 'json',
      query: { private: true },
    });

    res.status(202).json({
      success: true,
      message: 'Backup tasks started',
      backup: {
        backupDir: backupDir,
        privateBackupDir: privateBackupDir,
        startedAt: new Date().toISOString(),
      },
    });
  });
};
