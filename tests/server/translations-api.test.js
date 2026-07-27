'use strict';

const express = require('express');
const request = require('supertest');

const mockFind = jest.fn();
const mockFindOne = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockEnsureCurrentRevision = jest.fn();
const mockLogEntryEvent = jest.fn();

jest.mock('../../server/src/app', () => ({ db: { models: { EntryTranslation: {
  find: (...args) => mockFind(...args), findOne: (...args) => mockFindOne(...args),
  findOneAndUpdate: (...args) => mockFindOneAndUpdate(...args), findById: jest.fn(),
} } } }));
jest.mock('../../server/src/services/entryRevisionService', () => ({ ensureCurrentRevision: (...args) => mockEnsureCurrentRevision(...args) }));
jest.mock('../../server/src/services/entryEventsService', () => ({ logEntryEvent: (...args) => mockLogEntryEvent(...args) }));
jest.mock('../../server/src/services/notificationsService', () => ({ notifySubscribers: jest.fn() }));

function appFor(user) {
  const app = express(); app.use(express.json());
  app.use((req, _res, next) => { req.user = user; next(); });
  const router = express.Router(); require('../../server/src/controllers/api/translations')(router);
  app.use('/api/translations', router); return app;
}

describe('revision-linked translations api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnsureCurrentRevision.mockResolvedValue({ _id: 'revision-2', revisionNumber: 2 });
    mockFind.mockReturnValue({ sort: () => ({ lean: async () => [{ _id: 'translation-1', sourceRevisionId: 'revision-1', locale: 'fil', status: 'published' }] }) });
    mockFindOne.mockResolvedValue(null);
    mockFindOneAndUpdate.mockReturnValue({ lean: async () => ({ _id: 'translation-2', locale: 'fil', status: 'pending' }) });
    mockLogEntryEvent.mockResolvedValue(undefined);
  });

  it('marks published variants stale when their source revision is no longer current', async () => {
    const response = await request(appFor(null)).get('/api/translations/topic/topic-1').expect(200);
    expect(response.body.translations[0]).toEqual(expect.objectContaining({ locale: 'fil', stale: true }));
  });

  it('submits authenticated variants against the current immutable revision', async () => {
    const user = { _id: 'user-1', username: 'translator', canPlayRoleOf: () => false };
    const response = await request(appFor(user)).post('/api/translations/topic/topic-1').send({
      locale: 'fil', title: 'Isinaling pamagat', content: 'Ito ang sapat na mahabang salin ng nilalaman.',
    }).expect(201);
    expect(response.body.translation.status).toBe('pending');
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
      $set: expect.objectContaining({ sourceRevisionId: 'revision-2', sourceRevisionNumber: 2, status: 'pending' }),
    }), expect.objectContaining({ upsert: true }));
  });
});
