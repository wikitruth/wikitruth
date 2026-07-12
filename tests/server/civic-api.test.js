'use strict';

const express = require('express');
const request = require('supertest');

const countDocuments = jest.fn();
const find = jest.fn();
const findById = jest.fn();
const findOne = jest.fn();
const create = jest.fn();
const logEntryEvent = jest.fn();

jest.mock('../../server/src/app', () => ({
  db: {
    models: {
      CivicRecord: {
        countDocuments: (...args) => countDocuments(...args),
        find: (...args) => find(...args),
        findById: (...args) => findById(...args),
        findOne: (...args) => findOne(...args),
        create: (...args) => create(...args),
      },
    },
  },
}));

jest.mock('../../server/src/services/entryEventsService', () => ({
  logEntryEvent: (...args) => logEntryEvent(...args),
}));

function queryResult(value) {
  const chain = {
    sort: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    select: jest.fn(() => chain),
    lean: jest.fn(async () => value),
  };
  return chain;
}

function createApp(user) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    req.session = { preferences: {} };
    next();
  });
  const router = express.Router();
  require('../../server/src/controllers/api/civic')(router);
  app.use('/api/civic', router);
  return app;
}

describe('FixPH civic API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    countDocuments.mockResolvedValue(0);
    find.mockReturnValue(queryResult([]));
    findOne.mockReturnValue(queryResult(null));
    logEntryEvent.mockResolvedValue(undefined);
  });

  it('provides public civic overview counts and queues', async () => {
    find
      .mockReturnValueOnce(queryResult([{ _id: 'recent', kind: 'project', title: 'Public project' }]))
      .mockReturnValueOnce(queryResult([{ _id: 'urgent', kind: 'incident', severity: 'critical' }]));

    const response = await request(createApp()).get('/api/civic/overview').expect(200);

    expect(response.body.counts).toEqual(expect.objectContaining({ project: 0, incident: 0, candidate: 0 }));
    expect(response.body.recent).toHaveLength(1);
    expect(response.body.urgent).toHaveLength(1);
    expect(countDocuments).toHaveBeenCalledTimes(10);
  });

  it('requires an authenticated contributor for submissions', async () => {
    await request(createApp())
      .post('/api/civic/records')
      .send({ kind: 'incident', title: 'A reported incident' })
      .expect(401);

    expect(create).not.toHaveBeenCalled();
  });

  it('creates screened civic records with initial public history', async () => {
    const record = {
      _id: '66f000000000000000000001',
      kind: 'project',
      title: 'Barangay health center upgrade',
      status: 'pending',
      stage: 'reported',
    };
    create.mockResolvedValue(record);
    const user = {
      _id: '66f000000000000000000010',
      username: 'citizen',
      canPlayRoleOf: (role) => role === 'contributor',
    };

    const response = await request(createApp(user))
      .post('/api/civic/records')
      .send({
        kind: 'project',
        title: 'Barangay health center upgrade',
        summary: 'Track the public budget and construction progress.',
        project: { budget: 2500000, currency: 'PHP', progressPercent: 35 },
        location: { countryCode: 'PH', region: 'NCR', city: 'Quezon City' },
      })
      .expect(201);

    expect(response.body.record).toEqual(record);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'project',
      status: 'pending',
      stage: 'reported',
      friendlyUrl: 'barangay-health-center-upgrade',
      history: [expect.objectContaining({ action: 'created', toStatus: 'pending' })],
    }));
    expect(logEntryEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'civic.record.created' }));
  });

  it('records reviewer lifecycle decisions with privileged audit evidence', async () => {
    const history = [];
    const record = {
      _id: '66f000000000000000000001',
      kind: 'incident',
      status: 'pending',
      stage: 'screening',
      history,
      save: jest.fn().mockResolvedValue(undefined),
    };
    findById.mockResolvedValue(record);
    const reviewer = {
      _id: '66f000000000000000000011',
      username: 'reviewer',
      canPlayRoleOf: (role) => role === 'reviewer',
    };

    const response = await request(createApp(reviewer))
      .post('/api/civic/records/66f000000000000000000001/transition')
      .send({ status: 'verified', stage: 'investigating', reason: 'Evidence and responsible office were independently confirmed.' })
      .expect(200);

    expect(response.body.record.status).toBe('verified');
    expect(record.save).toHaveBeenCalledTimes(1);
    expect(history).toEqual([expect.objectContaining({
      fromStatus: 'pending',
      toStatus: 'verified',
      reason: 'Evidence and responsible office were independently confirmed.',
    })]);
    expect(logEntryEvent).toHaveBeenCalledWith(expect.objectContaining({
      scope: 'privileged',
      eventType: 'civic.record.transitioned',
    }));
  });

  it('rejects lifecycle changes without a reasoned decision', async () => {
    const reviewer = { canPlayRoleOf: (role) => role === 'reviewer' };
    await request(createApp(reviewer))
      .post('/api/civic/records/66f000000000000000000001/transition')
      .send({ status: 'verified', reason: 'too short' })
      .expect(400);
    expect(findById).not.toHaveBeenCalled();
  });
});
