'use strict';

const express = require('express');
const request = require('supertest');

const membershipFind = jest.fn();
const membershipUpdate = jest.fn();
const userFind = jest.fn();
const userFindById = jest.fn();
const jurisdictionFindOne = jest.fn();
const jurisdictionCreate = jest.fn();
const jurisdictionUpdate = jest.fn();
const jurisdictionCount = jest.fn();
const logEntryEvent = jest.fn();

function queryResult(value) {
  const chain = {
    sort: jest.fn(() => chain),
    select: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    lean: jest.fn(async () => value),
  };
  return chain;
}

jest.mock('../../server/src/app', () => ({
  db: {
    models: {
      CivicTenant: { find: jest.fn(), findOne: jest.fn(), findOneAndUpdate: jest.fn(), create: jest.fn() },
      TenantMembership: {
        find: (...args) => membershipFind(...args),
        findOne: jest.fn(),
        findOneAndUpdate: (...args) => membershipUpdate(...args),
      },
      User: {
        find: (...args) => userFind(...args),
        findById: (...args) => userFindById(...args),
      },
      Jurisdiction: {
        findOne: (...args) => jurisdictionFindOne(...args),
        create: (...args) => jurisdictionCreate(...args),
        findOneAndUpdate: (...args) => jurisdictionUpdate(...args),
        countDocuments: (...args) => jurisdictionCount(...args),
      },
    },
  },
}));

jest.mock('../../server/src/services/entryEventsService', () => ({
  logEntryEvent: (...args) => logEntryEvent(...args),
}));

jest.mock('../../server/src/services/civicAuthorizationService', () => ({
  ensureCivicTenantRole: jest.fn(async () => true),
}));

const { registerCivicAdministrationRoutes } = require('../../server/src/controllers/api/civicAdministration');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { _id: '66f000000000000000000001', username: 'tenant-admin', canPlayRoleOf: () => true };
    req.civicTenant = {
      tenantId: 'fix-example', countryCode: 'XZ',
      geography: { levels: [{ key: 'district', label: 'District' }] },
    };
    next();
  });
  const router = express.Router();
  registerCivicAdministrationRoutes(router);
  app.use('/api/civic', router);
  return app;
}

describe('civic tenant administration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    membershipFind.mockReturnValue(queryResult([]));
    membershipUpdate.mockReturnValue(queryResult(null));
    userFind.mockReturnValue(queryResult([]));
    userFindById.mockReturnValue(queryResult(null));
    jurisdictionFindOne.mockReturnValue(queryResult(null));
    jurisdictionCreate.mockResolvedValue(null);
    jurisdictionUpdate.mockResolvedValue(null);
    jurisdictionCount.mockResolvedValue(0);
    logEntryEvent.mockResolvedValue(undefined);
  });

  it('enriches memberships with a privacy-limited user identity', async () => {
    membershipFind.mockReturnValue(queryResult([{
      _id: 'membership-1', tenantId: 'fix-example', userId: '66f000000000000000000010', roles: ['contributor'], active: true,
    }]));
    userFind.mockReturnValue(queryResult([{
      _id: '66f000000000000000000010', username: 'citizen', email: 'citizen@example.test', password: 'must-not-leak',
    }]));

    const response = await request(createApp()).get('/api/civic/admin/memberships').expect(200);

    expect(response.body.memberships[0].user).toEqual({
      _id: '66f000000000000000000010', username: 'citizen', email: 'citizen@example.test',
    });
    expect(response.body.memberships[0].user).not.toHaveProperty('password');
  });

  it('requires a bounded search and returns only membership candidate fields', async () => {
    await request(createApp()).get('/api/civic/admin/membership-candidates?q=x').expect(400);
    userFind.mockReturnValue(queryResult([{
      _id: '66f000000000000000000010', username: 'citizen', email: 'citizen@example.test', roles: { admin: true },
    }]));

    const response = await request(createApp()).get('/api/civic/admin/membership-candidates?q=citizen').expect(200);

    expect(response.body.users).toEqual([{
      _id: '66f000000000000000000010', username: 'citizen', email: 'citizen@example.test',
    }]);
    expect(userFind).toHaveBeenCalledWith(expect.objectContaining({ isActive: 'yes' }));
  });

  it('rejects jurisdiction parent cycles', async () => {
    jurisdictionFindOne
      .mockReturnValueOnce(queryResult({ _id: '66f000000000000000000020', parentId: null }))
      .mockReturnValueOnce(queryResult({ _id: '66f000000000000000000020', parentId: '66f000000000000000000021' }));

    await request(createApp())
      .put('/api/civic/admin/jurisdictions/66f000000000000000000021')
      .send({ parentId: '66f000000000000000000020' })
      .expect(400);

    expect(jurisdictionUpdate).not.toHaveBeenCalled();
  });

  it('audits jurisdiction deactivation', async () => {
    jurisdictionUpdate.mockResolvedValue({ _id: '66f000000000000000000020', code: 'D1', active: false });

    await request(createApp()).delete('/api/civic/admin/jurisdictions/66f000000000000000000020').expect(200);

    expect(logEntryEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'civic.jurisdiction.deactivated',
      payload: expect.objectContaining({ tenantId: 'fix-example', code: 'D1' }),
    }));
  });
});
