'use strict';

const express = require('express');
const request = require('supertest');

const countDocuments = jest.fn();
const find = jest.fn();
const findById = jest.fn();
const findOne = jest.fn();
const create = jest.fn();
const findMembership = jest.fn();
const logEntryEvent = jest.fn();
const recordEntryRevision = jest.fn();
const notifySubscribers = jest.fn();

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
      TenantMembership: {
        findOne: (...args) => findMembership(...args),
      },
    },
  },
}));

jest.mock('../../server/src/services/entryEventsService', () => ({
  logEntryEvent: (...args) => logEntryEvent(...args),
}));

jest.mock('../../server/src/controllers/api/revisionWriteRecorder', () => ({
  recordEntryRevision: (...args) => recordEntryRevision(...args),
}));

jest.mock('../../server/src/services/notificationsService', () => ({
  notifySubscribers: (...args) => notifySubscribers(...args),
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
    findMembership.mockReturnValue(queryResult(null));
    logEntryEvent.mockResolvedValue(undefined);
    recordEntryRevision.mockResolvedValue(undefined);
    notifySubscribers.mockResolvedValue(0);
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
    expect(countDocuments).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'fixtheph' }));
  });

  it('resolves and exposes the public tenant when mounted directly by Kraken', async () => {
    const response = await request(createApp()).get('/api/civic/tenant').expect(200);

    expect(response.body.tenant).toEqual(expect.objectContaining({
      tenantId: 'fixtheph',
      countryCode: 'PH',
      title: 'Fix The Philippines',
    }));
    expect(response.body.tenant).not.toHaveProperty('createUserId');
    expect(response.body.tenant).not.toHaveProperty('editUserId');
  });

  it('exposes tenant-scoped roles for the current actor', async () => {
    findMembership.mockReturnValue(queryResult({ roles: ['contributor', 'reviewer'], active: true }));
    const user = {
      _id: '66f000000000000000000012',
      canPlayRoleOf: () => false,
    };

    const response = await request(createApp(user)).get('/api/civic/me').expect(200);

    expect(response.body).toEqual({
      authenticated: true,
      tenantId: 'fixtheph',
      userId: user._id,
      roles: ['contributor', 'reviewer'],
    });
  });

  it('lets tenant administrators view the complete tenant record set', async () => {
    findMembership.mockReturnValue(queryResult({ roles: ['admin'] }));
    const tenantAdmin = {
      _id: '66f000000000000000000012',
      canPlayRoleOf: () => false,
    };

    await request(createApp(tenantAdmin)).get('/api/civic/overview').expect(200);

    expect(findMembership).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'fixtheph',
      userId: tenantAdmin._id,
      active: true,
    }));
    expect(countDocuments).toHaveBeenCalledWith(expect.not.objectContaining({ private: false }));
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
      tenantId: 'fixtheph',
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
        location: { countryCode: 'XZ', region: 'NCR', city: 'Quezon City' },
        extensions: { funding_source: 'National budget', procurement_method: 'public_bidding' },
      })
      .expect(201);

    expect(response.body.record).toEqual(record);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'project',
      tenantId: 'fixtheph',
      countryCode: 'PH',
      status: 'pending',
      stage: 'reported',
      friendlyUrl: 'barangay-health-center-upgrade',
      location: expect.objectContaining({ countryCode: 'PH' }),
      extensions: { funding_source: 'National budget', procurement_method: 'public_bidding' },
      history: [expect.objectContaining({ action: 'created', toStatus: 'pending' })],
    }));
    expect(logEntryEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'civic.record.created' }));
    expect(recordEntryRevision).toHaveBeenCalledWith(expect.objectContaining({
      objectType: 40,
      source: 'create',
    }));
  });

  it('rejects undeclared or invalid tenant extension values before persistence', async () => {
    const user = {
      _id: '66f000000000000000000010', username: 'citizen',
      canPlayRoleOf: (role) => role === 'contributor',
    };
    const response = await request(createApp(user))
      .post('/api/civic/records')
      .send({
        kind: 'project', title: 'Project with invalid local fields',
        extensions: { procurement_method: 'secret_method', arbitrary_code: 'unsafe' },
      })
      .expect(400);

    expect(response.body.message).toBe('Invalid tenant-specific civic data');
    expect(response.body.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'extensions.procurement_method' }),
      expect.objectContaining({ path: 'extensions.arbitrary_code' }),
    ]));
    expect(create).not.toHaveBeenCalled();
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
    findOne.mockResolvedValue(record);
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
    expect(notifySubscribers).toHaveBeenCalledWith(expect.objectContaining({
      target: expect.objectContaining({ objectType: 40 }),
    }));
  });

  it('preserves unedited nested civic details during partial updates', async () => {
    const user = {
      _id: '66f000000000000000000010',
      username: 'citizen',
      canPlayRoleOf: (role) => role === 'contributor',
    };
    const record = {
      _id: '66f000000000000000000001',
      kind: 'project',
      title: 'Health center upgrade',
      friendlyUrl: 'health-center-upgrade',
      private: false,
      createUserId: user._id,
      parentId: null,
      jurisdictionId: null,
      project: { budget: 1000, currency: 'PHP', contractor: 'Builder One', contractReference: 'CTR-1' },
      location: { countryCode: 'PH', province: 'Metro Manila', city: 'Old City' },
      history: [],
      toObject() { return { ...this }; },
      save: jest.fn().mockResolvedValue(undefined),
    };
    findOne.mockResolvedValue(record);

    await request(createApp(user))
      .put('/api/civic/records/66f000000000000000000001')
      .send({ project: { budget: 2000 }, location: { city: 'New City' } })
      .expect(200);

    expect(record.project).toEqual(expect.objectContaining({ budget: 2000, contractor: 'Builder One', contractReference: 'CTR-1' }));
    expect(record.location).toEqual(expect.objectContaining({ province: 'Metro Manila', city: 'New City' }));
    expect(record.save).toHaveBeenCalledTimes(1);
  });

  it('rejects lifecycle changes without a reasoned decision', async () => {
    const reviewer = { canPlayRoleOf: (role) => role === 'reviewer' };
    await request(createApp(reviewer))
      .post('/api/civic/records/66f000000000000000000001/transition')
      .send({ status: 'verified', reason: 'too short' })
      .expect(400);
    expect(findOne).not.toHaveBeenCalled();
  });
});
