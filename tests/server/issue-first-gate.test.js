'use strict';

const countDocuments = jest.fn();
const logEntryEvent = jest.fn();

jest.mock('../../server/src/app', () => ({
  db: { models: { Issue: { countDocuments: (...args) => countDocuments(...args) } } },
}));
jest.mock('../../server/src/services/entryEventsService', () => ({
  logEntryEvent: (...args) => logEntryEvent(...args),
}));

const { enforceIssueFirstGate } = require('../../server/src/services/issueGateService');

function response() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

describe('Issue-first moderation gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    logEntryEvent.mockResolvedValue(undefined);
  });

  it('allows actions when no accepted critical issue remains open', async () => {
    countDocuments.mockResolvedValue(0);
    const res = response();
    const allowed = await enforceIssueFirstGate({
      req: { body: {}, user: {} }, res, objectType: 1, objectName: 'topic', objectId: 'topic-1', action: 'discussion',
    });
    expect(allowed).toBe(true);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks discussion and final verdicts while accepted critical issues are open', async () => {
    countDocuments.mockResolvedValue(2);
    const res = response();
    const allowed = await enforceIssueFirstGate({
      req: { body: {}, user: {} }, res, objectType: 2, objectName: 'argument', objectId: 'argument-1', action: 'factual_verdict',
    });
    expect(allowed).toBe(false);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'CRITICAL_ISSUES_BLOCK_ACTION',
      blockingIssueCount: 2,
    }));
  });

  it('allows only an administrator override with a substantive audited reason', async () => {
    countDocuments.mockResolvedValue(1);
    const res = response();
    const req = {
      body: { issueGateOverrideReason: 'Emergency publication is required for public safety.' },
      user: { id: 'admin-1', username: 'admin', canPlayRoleOf: (role) => role === 'admin' },
    };
    const allowed = await enforceIssueFirstGate({
      req, res, objectType: 1, objectName: 'topic', objectId: 'topic-1', action: 'discussion',
    });
    expect(allowed).toBe(true);
    expect(logEntryEvent).toHaveBeenCalledWith(expect.objectContaining({
      scope: 'privileged',
      eventType: 'moderation.issue-gate.overridden',
    }));
  });
});
