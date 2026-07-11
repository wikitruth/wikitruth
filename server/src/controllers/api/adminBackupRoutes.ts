'use strict';

import type { Router } from 'express';

import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import {
  bodyOf,
  queryOf,
  type AdminAuditEventsQueryContract,
  type AdminDbBackupActionBodyContract,
} from '../../types/controllerContracts';

import appModForDb from '../../app';
import config from '../../config/config';
import * as flowUtils from '../../utils/flowUtils';
import {
  listPrivilegedEvents,
  logEntryEvent,
  verifyPrivilegedEventChain,
} from '../../services/entryEventsService';
import {
  createDatabaseBackup,
  type BackupDatabaseConnection,
} from '../../services/databaseBackupService';
import fs from 'fs';
import path from 'path';

type EnsureAdmin = (req: WikitruthRequest, res: WikitruthResponse) => boolean;

type GenericModel = {
  find?: (query?: Record<string, unknown>) => {
    sort(sort: Record<string, 1 | -1>): unknown;
    select?(projection: string): unknown;
    limit(limit: number): unknown;
    lean(): Promise<Array<Record<string, unknown>>>;
  };
  deleteMany?: (query: Record<string, unknown>) => Promise<unknown>;
  create?: (payload: Record<string, unknown>) => Promise<unknown>;
};

type DbContract = Record<string, GenericModel> & {
  User: {
    find: (query?: Record<string, unknown>) => {
      sort(sort: Record<string, 1 | -1>): {
        select(projection: string): {
          lean(): Promise<Array<{ _id?: unknown; username?: unknown }>>;
        };
      };
    };
  };
};

const databaseConnection = (appModForDb as unknown as {
  db: BackupDatabaseConnection & { models: DbContract };
}).db;
const db = databaseConnection.models;

export interface RestoreSummary {
  public: Record<string, { restored: number; skipped: boolean }>;
  private: Record<string, { restored: number; skipped: boolean }>;
}

export interface BackupAvailability {
  ready: boolean;
  requiredCollections: string[];
  missingCollections: string[];
}

function ensureDir(dirPath: string): void {
  if (fs.existsSync(dirPath)) {
    return;
  }
  fs.mkdirSync(dirPath, { recursive: true });
}

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function toRestoreBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return fallback;
    }
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }
  return fallback;
}

async function restoreCollectionFromDirectory(options: {
  collectionName: string;
  collectionDir: string;
  overwriteQuery?: Record<string, unknown>;
  modelMapping: Record<string, string>;
}): Promise<{ restored: number; skipped: boolean }> {
  const { collectionName, collectionDir, overwriteQuery, modelMapping } = options;
  if (!fs.existsSync(collectionDir)) {
    return { restored: 0, skipped: true };
  }

  const modelName = modelMapping[collectionName];
  const model = modelName ? db[modelName] : undefined;
  if (!model || typeof model.deleteMany !== 'function' || typeof model.create !== 'function') {
    return { restored: 0, skipped: true };
  }

  const files = fs
    .readdirSync(collectionDir)
    .filter((name: string) => name.endsWith('.json'))
    .sort((a: string, b: string) => a.localeCompare(b));

  // Parse the complete collection before deleting existing documents.
  const documents = files.map((jsonFile: string) => {
    const file = path.join(collectionDir, jsonFile);
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
  });

  if (overwriteQuery) {
    await model.deleteMany(overwriteQuery);
  } else {
    await model.deleteMany({});
  }

  let restored = 0;
  for (const doc of documents) {
    await model.create(doc);
    restored += 1;
  }

  return { restored, skipped: false };
}

function collectionHasJsonFiles(collectionDir: string): boolean {
  try {
    if (!fs.existsSync(collectionDir)) {
      return false;
    }
    return fs.readdirSync(collectionDir).some((name: string) => name.endsWith('.json'));
  } catch (_error) {
    return false;
  }
}

export function getBootstrapBackupAvailability(): BackupAvailability {
  const requiredCollections = ['admins', 'users', 'topics'];
  const publicRoot = path.join(flowUtils.getBackupDir(), String(config.mongodb?.dbname || '').trim());
  const missingCollections = requiredCollections.filter(
    (collectionName) => !collectionHasJsonFiles(path.join(publicRoot, collectionName))
  );

  return {
    ready: missingCollections.length === 0,
    requiredCollections,
    missingCollections,
  };
}

export async function restoreDatabaseBackup(options: {
  restorePublicData: boolean;
  restorePrivateData: boolean;
}): Promise<RestoreSummary> {
  const { restorePublicData, restorePrivateData } = options;
  const backupDir = flowUtils.getBackupDir();
  const privateBackupDir = path.join(flowUtils.getBackupDir(true), 'users');
  const collections = config.mongodb?.collections || {};
  const dbName = String(config.mongodb?.dbname || '').trim();
  const modelMapping = (collections.modelMapping || {}) as Record<string, string>;
  const summary: RestoreSummary = {
    public: {},
    private: {},
  };

  if (restorePublicData) {
    const publicRoot = path.join(backupDir, dbName);
    const publicCollections = Array.from(
      new Set([...(collections.backupList || []), ...(collections.privateBackupList || [])])
    ) as string[];

    for (const collectionName of publicCollections) {
      const collectionDir = path.join(publicRoot, collectionName);
      summary.public[collectionName] = await restoreCollectionFromDirectory({
        collectionName,
        collectionDir,
        modelMapping,
      });
    }
  }

  if (restorePrivateData) {
    const users = await db.User.find({}).sort({ username: 1 }).select('_id username').lean();
    for (const user of users) {
      const usernameKey = String(user.username || '').trim();
      if (!usernameKey) {
        continue;
      }
      const userRoot = path.join(privateBackupDir, usernameKey, dbName);
      for (const collectionName of (collections.privateBackupList || []) as string[]) {
        const collectionDir = path.join(userRoot, collectionName);
        const key = `${usernameKey}:${collectionName}`;
        summary.private[key] = await restoreCollectionFromDirectory({
          collectionName,
          collectionDir,
          modelMapping,
          overwriteQuery: {
            private: true,
            createUserId: user._id,
          },
        });
      }
    }
  }

  return summary;
}

export function registerAdminBackupRoutes(router: Router, ensureAdmin: EnsureAdmin): void {
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

    const body = bodyOf<AdminDbBackupActionBodyContract>(req);
    const action = String(body.action || body.buttonAction || 'backup');
    const backupDir = flowUtils.getBackupDir();
    const privateBackupDir = path.join(flowUtils.getBackupDir(true), 'users');
    ensureDir(backupDir);
    ensureDir(privateBackupDir);

    const collections = config.mongodb?.collections || {};
    const userId = String(req.user?._id || req.user?.id || '');
    const username = String(req.user?.username || '');

    if (action === 'backup') {
      const users = await db.User.find({}).sort({ username: 1 }).select('_id username').lean();
      const summary = await createDatabaseBackup({
        connection: databaseConnection,
        databaseName: String(config.mongodb?.dbname || '').trim(),
        publicRoot: backupDir,
        privateUsersRoot: privateBackupDir,
        publicCollections: (collections.backupList || []) as string[],
        privateCollections: (collections.privateBackupList || []) as string[],
        users,
      });
      const completedAt = new Date().toISOString();

      await logEntryEvent({
        scope: 'privileged',
        eventType: 'admin.backup.completed',
        objectType: 1,
        objectName: 'topic',
        objectId: String(req.user?._id || req.user?.id || req.user?.username || 'admin'),
        actorUserId: userId,
        actorUsername: username,
        message: 'Completed database backup',
        payload: {
          backupDir,
          privateBackupDir,
          summary,
        },
      });

      res.json({
        success: true,
        message: 'Backup completed',
        backup: {
          backupDir: backupDir,
          privateBackupDir: privateBackupDir,
          completedAt,
          summary,
        },
      });
      return;
    }

    if (action === 'restore') {
      const confirmText = String(body.confirmText || body.confirm || '').trim().toUpperCase();
      if (confirmText !== 'RESTORE') {
        res.status(400).json({
          success: false,
          message: 'Restore confirmation failed. Type RESTORE to continue.',
        });
        return;
      }

      const restorePublicData = toRestoreBoolean(body.restorePublicData, true);
      const restorePrivateData = toRestoreBoolean(body.restorePrivateData, true);
      if (!restorePublicData && !restorePrivateData) {
        res.status(400).json({
          success: false,
          message: 'At least one restore scope must be selected.',
        });
        return;
      }

      const summary = await restoreDatabaseBackup({
        restorePublicData,
        restorePrivateData,
      });

      await logEntryEvent({
        scope: 'privileged',
        eventType: 'admin.backup.restore',
        objectType: 1,
        objectName: 'topic',
        objectId: String(req.user?._id || req.user?.id || req.user?.username || 'admin'),
        actorUserId: userId,
        actorUsername: username,
        message: 'Executed backup restore',
        payload: {
          restorePublicData,
          restorePrivateData,
          summary,
        },
      });

      res.json({
        success: true,
        message: 'Restore completed',
        restore: {
          restorePublicData,
          restorePrivateData,
          completedAt: new Date().toISOString(),
          summary,
        },
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: `Unsupported backup action: ${action}`,
    });
  });

  router.get('/audit-events', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const query = queryOf<AdminAuditEventsQueryContract>(req);
    const page = toPositiveInt(query.page, 1);
    const limit = Math.min(toPositiveInt(query.limit, 25), 100);
    const objectType = Number(query.objectType || 0);
    const eventTypes = String(query.eventTypes || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const result = await listPrivilegedEvents({
      page,
      limit,
      eventTypes,
      objectType: objectType > 0 ? objectType : null,
    });

    res.json({
      success: true,
      events: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  });

  router.get('/audit-events/verify', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }
    const verification = await verifyPrivilegedEventChain();
    res.status(verification.valid ? 200 : 409).json({
      success: verification.valid,
      verification,
    });
  });
}
