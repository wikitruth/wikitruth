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

  router.get('/accounts', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const accounts = await db.Account.find().limit(100).lean();
    res.json(accounts);
  });

  router.get('/administrators', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const admins = await db.Admin.find().limit(100).lean();
    res.json(admins);
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
