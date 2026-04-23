import express from 'express';
import request from 'supertest';

const findUsers = jest.fn();
const deleteManyTopic = jest.fn();
const createTopic = jest.fn();
const countDocuments = jest.fn();
const getBackupDir = jest.fn();
const logEntryEvent = jest.fn();

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

jest.mock('mongodb-backup-fixed', () => jest.fn());

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
  });

  it('rejects restore requests without RESTORE confirmation text', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/admin/db-backup')
      .send({ action: 'restore', confirmText: 'nope', restorePublicData: true, restorePrivateData: true })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/type RESTORE/i);
  });

  it('rejects restore requests when no scope is selected', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/admin/db-backup')
      .send({ action: 'restore', confirmText: 'RESTORE', restorePublicData: false, restorePrivateData: false })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/at least one restore scope/i);
  });

  it('restores public and private scopes and records restore audit event', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/admin/db-backup')
      .send({ action: 'restore', confirmText: 'RESTORE', restorePublicData: true, restorePrivateData: true })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.restore.restorePublicData).toBe(true);
    expect(response.body.restore.restorePrivateData).toBe(true);

    expect(deleteManyTopic).toHaveBeenCalledWith({});
    expect(deleteManyTopic).toHaveBeenCalledWith({
      private: true,
      createUserId: 'user-1',
    });
    expect(createTopic).toHaveBeenCalledTimes(2);
    expect(logEntryEvent).toHaveBeenCalledTimes(1);
  });
});
