import express from 'express';
import request from 'supertest';

const countAdmins = jest.fn();
const countTopics = jest.fn();
const countUsers = jest.fn();
const getBootstrapBackupAvailability = jest.fn();
const restoreDatabaseBackup = jest.fn();
const resetCache = jest.fn();
const logEntryEvent = jest.fn();

jest.mock('../../server/src/app', () => ({
  db: {
    models: {
      Admin: { countDocuments: (...args: unknown[]) => countAdmins(...args) },
      Topic: { countDocuments: (...args: unknown[]) => countTopics(...args) },
      User: { countDocuments: (...args: unknown[]) => countUsers(...args) },
    },
  },
}));

jest.mock('../../server/src/controllers/api/adminBackupRoutes', () => ({
  getBootstrapBackupAvailability: (...args: unknown[]) => getBootstrapBackupAvailability(...args),
  restoreDatabaseBackup: (...args: unknown[]) => restoreDatabaseBackup(...args),
}));

jest.mock('../../server/src/utils/flowUtils', () => ({
  resetCache: (...args: unknown[]) => resetCache(...args),
}));

jest.mock('../../server/src/services/entryEventsService', () => ({
  logEntryEvent: (...args: unknown[]) => logEntryEvent(...args),
}));

const registerInstallRoutes = require('../../server/src/controllers/api/install');

function createApp() {
  const app = express();
  app.use(express.json());
  const router = express.Router();
  registerInstallRoutes(router);
  app.use('/api/install', router);
  return app;
}

describe('empty-database bootstrap restore', () => {
  const originalToken = process.env.WIKITRUTH_INSTALL_TOKEN;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WIKITRUTH_INSTALL_TOKEN = 'test-bootstrap-token-123';
    countAdmins.mockResolvedValue(0);
    countTopics.mockResolvedValue(0);
    countUsers.mockResolvedValue(0);
    getBootstrapBackupAvailability.mockReturnValue({
      ready: true,
      requiredCollections: ['admins', 'users', 'topics'],
      missingCollections: [],
    });
    restoreDatabaseBackup.mockResolvedValue({ public: {}, private: {} });
    logEntryEvent.mockResolvedValue(undefined);
  });

  afterAll(() => {
    if (typeof originalToken === 'undefined') {
      delete process.env.WIKITRUTH_INSTALL_TOKEN;
    } else {
      process.env.WIKITRUTH_INSTALL_TOKEN = originalToken;
    }
  });

  it('reports eligibility only for an empty database with token and backup ready', async () => {
    const response = await request(createApp()).get('/api/install').expect(200);

    expect(response.body.install).toMatchObject({
      databaseEmpty: true,
      initialized: false,
      tokenConfigured: true,
      backupReady: true,
      eligible: true,
    });
  });

  it('rejects a restore when any core data already exists', async () => {
    countAdmins.mockResolvedValue(1);

    const response = await request(createApp())
      .post('/api/install/restore')
      .send({ bootstrapToken: 'test-bootstrap-token-123', confirmText: 'RESTORE' })
      .expect(409);

    expect(response.body.message).toMatch(/database is initialized/i);
    expect(restoreDatabaseBackup).not.toHaveBeenCalled();
  });

  it('rejects an invalid bootstrap token', async () => {
    const response = await request(createApp())
      .post('/api/install/restore')
      .send({ bootstrapToken: 'wrong-token', confirmText: 'RESTORE' })
      .expect(403);

    expect(response.body.message).toMatch(/token is invalid/i);
    expect(restoreDatabaseBackup).not.toHaveBeenCalled();
  });

  it('restores once and verifies required core data afterward', async () => {
    countAdmins.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    countTopics.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    countUsers.mockResolvedValueOnce(0).mockResolvedValueOnce(1);

    const response = await request(createApp())
      .post('/api/install/restore')
      .send({ bootstrapToken: 'test-bootstrap-token-123', confirmText: 'RESTORE' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(restoreDatabaseBackup).toHaveBeenCalledWith({
      restorePublicData: true,
      restorePrivateData: true,
    });
    expect(resetCache).toHaveBeenCalledTimes(1);
    expect(logEntryEvent).toHaveBeenCalledTimes(1);
  });
});
