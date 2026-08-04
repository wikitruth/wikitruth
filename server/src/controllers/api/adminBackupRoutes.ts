'use strict';

import type { Router } from 'express';

import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import {
  bodyOf,
  type AdminDbBackupActionBodyContract,
} from '../../types/controllerContracts';

import appModForDb from '../../app';
import config from '../../config/config';
import * as flowUtils from '../../utils/flowUtils';
import {
  logEntryEvent,
} from '../../services/entryEventsService';
import { registerAdminAuditRoutes } from './adminAuditRoutes';
import {
  type BackupDatabaseConnection,
} from '../../services/databaseBackupService';
import {
  compareSnapshotToCurrent,
  createBackupSnapshot,
  listBackupSnapshots,
  loadSnapshotManifest,
  signRestorePreview,
  snapshotRoots,
  testSnapshotRestore,
  verifyBackupSnapshot,
  verifyRestorePreview,
} from '../../services/backupSnapshotService';
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
  publicRoot?: string;
  privateUsersRoot?: string;
}): Promise<RestoreSummary> {
  const { restorePublicData, restorePrivateData } = options;
  const backupDir = options.publicRoot || flowUtils.getBackupDir();
  const privateBackupDir = options.privateUsersRoot || path.join(flowUtils.getBackupDir(true), 'users');
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
    const hasGitBackup = Boolean(config.mongodb?.gitBackup);
    const snapshots = listBackupSnapshots(backupDir);

    res.json({
      success: true,
      backup: {
        hasGitBackup: hasGitBackup,
        snapshotCount: snapshots.length,
        latestSnapshot: snapshots[0] || null,
        snapshots,
      },
    });
  });

  router.post('/db-backup/snapshots/:id/verify', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) return;
    try {
      const verification = verifyBackupSnapshot(flowUtils.getBackupDir(), String(req.params.id || ''));
      res.status(verification.valid ? 200 : 409).json({ success: verification.valid, verification });
    } catch (error) {
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Snapshot verification failed' });
    }
  });

  router.post('/db-backup/snapshots/:id/test', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) return;
    try {
      const test = await testSnapshotRestore({
        connection: databaseConnection,
        backupRoot: flowUtils.getBackupDir(),
        snapshotId: String(req.params.id || ''),
      });
      res.status(test.valid ? 200 : 409).json({ success: test.valid, test });
    } catch (error) {
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Restore test failed' });
    }
  });

  router.post('/db-backup/snapshots/:id/preview', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) return;
    try {
      const snapshotId = String(req.params.id || '');
      const backupRoot = flowUtils.getBackupDir();
      const manifest = loadSnapshotManifest(backupRoot, snapshotId);
      const verification = verifyBackupSnapshot(backupRoot, snapshotId);
      if (!verification.valid) {
        res.status(409).json({ success: false, message: 'Snapshot integrity verification failed.', verification });
        return;
      }
      const restorePublicData = toRestoreBoolean(req.body?.restorePublicData, true);
      const restorePrivateData = toRestoreBoolean(req.body?.restorePrivateData, true);
      if (!restorePublicData && !restorePrivateData) {
        res.status(400).json({ success: false, message: 'At least one restore scope must be selected.' });
        return;
      }
      const [comparison, test] = await Promise.all([
        compareSnapshotToCurrent(databaseConnection, manifest),
        testSnapshotRestore({ connection: databaseConnection, backupRoot, snapshotId }),
      ]);
      if (!test.valid) {
        res.status(409).json({ success: false, message: 'Snapshot did not pass isolated restore testing.', verification, test });
        return;
      }
      const secret = String((req.app as unknown as { config?: { cryptoKey?: string } }).config?.cryptoKey || '');
      const expiresAt = Date.now() + 10 * 60 * 1000;
      const token = signRestorePreview(secret, {
        snapshotId, checksum: manifest.checksum, restorePublicData, restorePrivateData,
        actorUserId: String(req.user?._id || req.user?.id || ''), expiresAt,
      });
      res.json({
        success: true,
        preview: {
          snapshot: manifest,
          verification,
          isolatedRestoreTest: test,
          comparison: comparison.filter((row) => row.scope === 'public' ? restorePublicData : restorePrivateData),
          confirmationPhrase: `RESTORE ${snapshotId}`,
          automaticPreRestoreSnapshot: true,
          expiresAt: new Date(expiresAt).toISOString(),
          token,
        },
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Restore preview failed' });
    }
  });

  router.post('/db-backup', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const body = bodyOf<AdminDbBackupActionBodyContract>(req);
    const action = String(body.action || body.buttonAction || 'backup');
    const backupDir = flowUtils.getBackupDir();
    ensureDir(backupDir);

    const collections = config.mongodb?.collections || {};
    const userId = String(req.user?._id || req.user?.id || '');
    const username = String(req.user?.username || '');

    if (action === 'backup') {
      const users = await db.User.find({}).sort({ username: 1 }).select('_id username').lean();
      const snapshot = await createBackupSnapshot({
        connection: databaseConnection,
        backupRoot: backupDir,
        databaseName: String(config.mongodb?.dbname || '').trim(),
        publicCollections: (collections.backupList || []) as string[],
        privateCollections: (collections.privateBackupList || []) as string[],
        users,
        createdByUserId: userId,
        offsiteConfigured: Boolean(config.mongodb?.gitBackup),
      });

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
          snapshotId: snapshot.id,
          checksum: snapshot.checksum,
          summary: snapshot.summary,
        },
      });

      res.json({
        success: true,
        message: 'Backup completed',
        backup: snapshot,
      });
      return;
    }

    if (action === 'restore') {
      const snapshotId = String(req.body?.snapshotId || '').trim();
      const confirmText = String(body.confirmText || body.confirm || '').trim();
      const preview = verifyRestorePreview(
        String((req.app as unknown as { config?: { cryptoKey?: string } }).config?.cryptoKey || ''),
        String(req.body?.previewToken || ''),
      );
      if (!preview || preview.snapshotId !== snapshotId || preview.actorUserId !== userId) {
        res.status(400).json({
          success: false,
          message: 'Restore preview is missing, invalid, or expired. Preview the snapshot again.',
        });
        return;
      }
      if (confirmText !== `RESTORE ${snapshotId}`) {
        res.status(400).json({ success: false, message: `Restore confirmation failed. Type RESTORE ${snapshotId} to continue.` });
        return;
      }

      const restorePublicData = Boolean(preview.restorePublicData);
      const restorePrivateData = Boolean(preview.restorePrivateData);
      if (!restorePublicData && !restorePrivateData) {
        res.status(400).json({
          success: false,
          message: 'At least one restore scope must be selected.',
        });
        return;
      }

      const manifest = loadSnapshotManifest(backupDir, snapshotId);
      const verification = verifyBackupSnapshot(backupDir, snapshotId);
      if (!verification.valid || preview.checksum !== manifest.checksum) {
        res.status(409).json({ success: false, message: 'Snapshot integrity changed after preview. Restore cancelled.', verification });
        return;
      }
      const isolatedTest = await testSnapshotRestore({ connection: databaseConnection, backupRoot: backupDir, snapshotId });
      if (!isolatedTest.valid) {
        res.status(409).json({ success: false, message: 'Isolated restore testing did not pass. Restore cancelled.', isolatedTest });
        return;
      }
      const users = await db.User.find({}).sort({ username: 1 }).select('_id username').lean();
      const preRestoreSnapshot = await createBackupSnapshot({
        connection: databaseConnection, backupRoot: backupDir,
        databaseName: String(config.mongodb?.dbname || '').trim(),
        publicCollections: (collections.backupList || []) as string[],
        privateCollections: (collections.privateBackupList || []) as string[],
        users, createdByUserId: userId, kind: 'pre_restore', offsiteConfigured: Boolean(config.mongodb?.gitBackup),
      });
      const roots = snapshotRoots(backupDir, snapshotId);
      const summary = await restoreDatabaseBackup({
        restorePublicData,
        restorePrivateData,
        publicRoot: roots.publicRoot,
        privateUsersRoot: roots.privateUsersRoot,
      });
      const postRestoreComparison = await compareSnapshotToCurrent(databaseConnection, manifest);

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
          snapshotId,
          preRestoreSnapshotId: preRestoreSnapshot.id,
          summary,
          postRestoreComparison,
        },
      });

      res.json({
        success: true,
        message: 'Restore completed',
        restore: {
          restorePublicData,
          restorePrivateData,
          snapshotId,
          preRestoreSnapshotId: preRestoreSnapshot.id,
          completedAt: new Date().toISOString(),
          summary,
          postRestoreComparison,
        },
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: `Unsupported backup action: ${action}`,
    });
  });

  registerAdminAuditRoutes(router, ensureAdmin);
}
