'use strict';

const express = require('express');
const request = require('supertest');
const mockRecordFindOne = jest.fn();
const mockResponseCreate = jest.fn();
const mockResponseFindOne = jest.fn();
const mockLog = jest.fn();

jest.mock('../../server/src/app', () => ({ db: { models: {
  CivicRecord: { findOne: (...args) => mockRecordFindOne(...args) },
  CivicResponseRequest: { create: (...args) => mockResponseCreate(...args), findOne: (...args) => mockResponseFindOne(...args) },
} } }));
jest.mock('../../server/src/services/civicAuthorizationService', () => ({
  ensureCivicTenantRole: jest.fn().mockResolvedValue(true), civicTenantRoles: jest.fn().mockResolvedValue(new Set(['reviewer'])),
}));
jest.mock('../../server/src/services/entryEventsService', () => ({ logEntryEvent: (...args) => mockLog(...args) }));
jest.mock('../../server/src/services/notificationsService', () => ({ notifySubscribers: jest.fn() }));

function selected(value) { return { select: () => ({ lean: async () => value }) }; }
function createApp(user) {
  const app = express(); app.use(express.json()); app.use((req, _res, next) => {
    req.user = user; req.civicTenant = { tenantId: 'fix-example' }; next();
  });
  const router = express.Router(); require('../../server/src/controllers/api/civicResponses').registerCivicResponseRoutes(router);
  app.use('/api/civic', router); return app;
}

describe('civic subject response and correction workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks(); mockRecordFindOne.mockReturnValue(selected({ _id: 'record-1', title: 'Public record' }));
    mockResponseCreate.mockResolvedValue({ _id: 'response-1', status: 'pending' }); mockLog.mockResolvedValue(undefined);
  });

  it('creates a pending tenant-scoped subject response with history', async () => {
    const response = await request(createApp({ _id: 'user-1', username: 'subject' }))
      .post('/api/civic/records/record-1/responses').send({
        requestType: 'subject_response', title: 'Response from subject',
        content: 'This is a detailed response to the claims in this public record.', claimedRelationship: 'Named subject',
      }).expect(201);
    expect(response.body.response.status).toBe('pending');
    expect(mockResponseCreate).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'fix-example', status: 'pending', history: [expect.objectContaining({ action: 'submitted' })],
    }));
  });
});
