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

  router.get('/categories', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const categories = await db.Category.find().limit(100).lean();
    res.json(categories);
  });

  router.get('/statuses', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const statuses = await db.Status.find().limit(100).lean();
    res.json(statuses);
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
