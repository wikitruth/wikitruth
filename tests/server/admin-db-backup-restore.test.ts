import express from 'express';
import request from 'supertest';

const findUsers = jest.fn();
const deleteManyTopic = jest.fn();
const createTopic = jest.fn();
const countDocuments = jest.fn();
const getBackupDir = jest.fn();
const logEntryEvent = jest.fn();
const createBackupSnapshot = jest.fn();
const listBackupSnapshots = jest.fn();
const loadSnapshotManifest = jest.fn();
const verifyBackupSnapshot = jest.fn();
const compareSnapshotToCurrent = jest.fn();
const testSnapshotRestore = jest.fn();
const signRestorePreview = jest.fn();
const verifyRestorePreview = jest.fn();
const snapshotRoots = jest.fn();

jest.mock('../../server/src/app', () => ({
  db: {
    models: {
      User: {
        find: (...args: unknown[]) => findUsers(...args),
        countDocuments: (...args: unknown[]) => countDocuments(...args),
      },
      Topic: {
        deleteMany: (...args: unknown[]) => deleteManyTopic(...args),
        create: (...args: unknown[]) => createTopic(...args),
      },
      Account: {
        countDocuments: (...args: unknown[]) => countDocuments(...args),
      },
      Category: {
        countDocuments: (...args: unknown[]) => countDocuments(...args),
      },
      Status: {
        countDocuments: (...args: unknown[]) => countDocuments(...args),
      },
    },
  },
}));

jest.mock('../../server/src/utils/flowUtils', () => ({
  getBackupDir: (...args: unknown[]) => getBackupDir(...args),
}));

jest.mock('../../server/src/config/config', () => ({
  mongodb: {
    uri: 'mongodb://localhost/wikitruth',
    dbname: 'wikitruth',
    collections: {
      backupList: ['topics'],
      privateBackupList: ['topics'],
      modelMapping: {
        topics: 'Topic',
      },
    },
  },
}));

jest.mock('../../server/src/services/entryEventsService', () => ({
  logEntryEvent: (...args: unknown[]) => logEntryEvent(...args),
  listPrivilegedEvents: jest.fn().mockResolvedValue({
    events: [],
    total: 0,
    page: 1,
    limit: 25,
  }),
}));

jest.mock('../../server/src/services/backupSnapshotService', () => ({
  createBackupSnapshot: (...args: unknown[]) => createBackupSnapshot(...args),
  listBackupSnapshots: (...args: unknown[]) => listBackupSnapshots(...args),
  loadSnapshotManifest: (...args: unknown[]) => loadSnapshotManifest(...args),
  verifyBackupSnapshot: (...args: unknown[]) => verifyBackupSnapshot(...args),
  compareSnapshotToCurrent: (...args: unknown[]) => compareSnapshotToCurrent(...args),
  testSnapshotRestore: (...args: unknown[]) => testSnapshotRestore(...args),
  signRestorePreview: (...args: unknown[]) => signRestorePreview(...args),
  verifyRestorePreview: (...args: unknown[]) => verifyRestorePreview(...args),
  snapshotRoots: (...args: unknown[]) => snapshotRoots(...args),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
}));

const fs = require('fs') as {
  existsSync: jest.Mock;
  mkdirSync: jest.Mock;
  readdirSync: jest.Mock;
  readFileSync: jest.Mock;
};

const registerAdminRoutes = require('../../server/src/controllers/api/admin');
const { restoreDatabaseBackup } = require('../../server/src/controllers/api/adminBackupRoutes');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req: { session?: Record<string, unknown> }, _res, next) => {
    req.user = {
      _id: 'admin-1',
      id: 'admin-1',
      username: 'admin',
      canPlayRoleOf: (role: string) => role === 'admin',
    };
    next();
  });
  const router = express.Router();
  registerAdminRoutes(router);
  app.use('/api/admin', router);
  return app;
}

function createUserQueryChain(users: Array<{ _id: string; username: string }>) {
  return {
    sort: () => ({
      select: () => ({
        lean: async () => users,
      }),
    }),
  };
}

describe('admin db backup restore route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getBackupDir.mockImplementation((isPrivate?: boolean) => (isPrivate ? '/tmp/backup-private' : '/tmp/backup'));
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(['topic-1.json']);
    fs.readFileSync.mockReturnValue(JSON.stringify({ _id: 'topic-1', title: 'Restored Topic' }));
    findUsers.mockReturnValue(createUserQueryChain([{ _id: 'user-1', username: 'alice' }]));
    deleteManyTopic.mockResolvedValue({ acknowledged: true });
    createTopic.mockResolvedValue({ _id: 'topic-1' });
    countDocuments.mockResolvedValue(0);
    logEntryEvent.mockResolvedValue(undefined);
    const manifest = {
      format: 'wikitruth.backup-snapshot', version: 1, id: '2026-08-04T00-00-00-000Z-12345678',
      createdAt: '2026-08-04T00:00:00.000Z', createdByUserId: 'admin-1', kind: 'manual',
      complete: true, totalDocuments: 2, totalBytes: 200, checksum: 'checksum', collections: [],
      summary: { public: { topics: 1 }, private: { 'alice:topics': 1 } },
      publicCollections: ['topics'], privateCollections: ['topics'],
      offsite: { configured: false, verifiedAt: null, reference: '' },
    };
    createBackupSnapshot.mockResolvedValue(manifest);
    listBackupSnapshots.mockReturnValue([manifest]);
    loadSnapshotManifest.mockReturnValue(manifest);
    verifyBackupSnapshot.mockReturnValue({ valid: true, snapshotId: manifest.id, expectedChecksum: 'checksum', actualChecksum: 'checksum' });
    compareSnapshotToCurrent.mockResolvedValue([{ collection: 'topics', current: 1, snapshot: 1, change: 0, scope: 'public' }]);
    testSnapshotRestore.mockResolvedValue({ supported: true, valid: true, collections: { topics: 2 }, message: 'ok' });
    signRestorePreview.mockReturnValue('preview-token');
    verifyRestorePreview.mockReturnValue({
      snapshotId: manifest.id, checksum: 'checksum', restorePublicData: true, restorePrivateData: true,
      actorUserId: 'admin-1', expiresAt: Date.now() + 10000,
    });
    snapshotRoots.mockReturnValue({ publicRoot: '/tmp/snapshot/public', privateUsersRoot: '/tmp/snapshot/private/users' });
  });

  it('waits for a complete backup and records its summary', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/admin/db-backup')
      .send({ action: 'backup' })
      .expect(200);

    expect(createBackupSnapshot).toHaveBeenCalledTimes(1);
    expect(response.body.message).toBe('Backup completed');
    expect(response.body.backup.summary).toEqual({
      public: { topics: 1 },
      private: { 'alice:topics': 1 },
    });
    expect(logEntryEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'admin.backup.completed',
      payload: expect.objectContaining({
        summary: expect.any(Object),
      }),
    }));
  });

  it('previews a checksum-verified, isolated restore before issuing a token', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/admin/db-backup/snapshots/2026-08-04T00-00-00-000Z-12345678/preview')
      .send({ restorePublicData: true, restorePrivateData: true })
      .expect(200);

    expect(response.body.preview.token).toBe('preview-token');
    expect(response.body.preview.automaticPreRestoreSnapshot).toBe(true);
    expect(testSnapshotRestore).toHaveBeenCalledTimes(1);
  });

  it('rejects restore requests without a valid preview', async () => {
    const app = createApp();
    verifyRestorePreview.mockReturnValueOnce(null);
    const response = await request(app)
      .post('/api/admin/db-backup')
      .send({ action: 'restore', snapshotId: 'snapshot', confirmText: 'RESTORE snapshot', previewToken: 'invalid' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/preview/i);
  });

  it('restores public and private scopes and records restore audit event', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/admin/db-backup')
      .send({
        action: 'restore', snapshotId: '2026-08-04T00-00-00-000Z-12345678',
        confirmText: 'RESTORE 2026-08-04T00-00-00-000Z-12345678', previewToken: 'preview-token',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.restore.restorePublicData).toBe(true);
    expect(response.body.restore.restorePrivateData).toBe(true);
    expect(response.body.restore.preRestoreSnapshotId).toBe('2026-08-04T00-00-00-000Z-12345678');

    expect(deleteManyTopic).toHaveBeenCalledWith({});
    expect(deleteManyTopic).toHaveBeenCalledWith({
      private: true,
      createUserId: 'user-1',
    });
    expect(createTopic).toHaveBeenCalledTimes(2);
    expect(logEntryEvent).toHaveBeenCalledTimes(1);
  });

  it('parses backup JSON before deleting existing collection data', async () => {
    fs.readFileSync.mockReturnValue('{invalid json');

    await expect(restoreDatabaseBackup({
      restorePublicData: true,
      restorePrivateData: false,
    })).rejects.toThrow();

    expect(deleteManyTopic).not.toHaveBeenCalled();
  });
});
