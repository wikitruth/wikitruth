'use strict';

const express = require('express');
const request = require('supertest');

const findIssueById = jest.fn();
const findOpinionById = jest.fn();
const recordEntryRevision = jest.fn();
const logEntryEvent = jest.fn();

jest.mock('../../server/src/controllers/api/moderationShared', () => ({
  db: {
    Issue: { findById: (...args) => findIssueById(...args) },
    Opinion: { findById: (...args) => findOpinionById(...args) },
  },
  ensureReviewerOrAdmin: (req, res) => {
    if (req.user?.canPlayRoleOf?.('reviewer') || req.user?.canPlayRoleOf?.('admin')) return true;
    res.status(403).json({ success: false });
    return false;
  },
  parseModerationTarget: (req) => {
    if (req.query.issue) return { objectType: 10, objectName: 'issue', id: String(req.query.issue) };
    if (req.query.opinion) return { objectType: 11, objectName: 'opinion', id: String(req.query.opinion) };
    return null;
  },
}));
jest.mock('../../server/src/controllers/api/revisionWriteRecorder', () => ({
  recordEntryRevision: (...args) => recordEntryRevision(...args),
}));
jest.mock('../../server/src/services/entryEventsService', () => ({
  logEntryEvent: (...args) => logEntryEvent(...args),
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: 'reviewer-1', username: 'reviewer', canPlayRoleOf: (role) => role === 'reviewer' };
    next();
  });
  const router = express.Router();
  require('../../server/src/controllers/api/moderationIssueRoutes').registerModerationIssueRoutes(router);
  app.use('/api/moderation', router);
  return app;
}

describe('Issue resolution and comment relevance moderation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    recordEntryRevision.mockResolvedValue(undefined);
    logEntryEvent.mockResolvedValue(undefined);
  });

  it('resolves an issue with revision and privileged audit evidence', async () => {
    const issue = { _id: 'issue-1', ownerType: 1, ownerId: 'topic-1', save: jest.fn().mockResolvedValue(undefined) };
    findIssueById.mockResolvedValue(issue);
    await request(createApp())
      .put('/api/moderation/issue-resolution?issue=issue-1')
      .send({ status: 'resolved', reason: 'The source and terminology were corrected.' })
      .expect(200);
    expect(issue.resolution).toEqual(expect.objectContaining({ status: 'resolved' }));
    expect(recordEntryRevision).toHaveBeenCalledTimes(1);
    expect(logEntryEvent).toHaveBeenCalledWith(expect.objectContaining({ scope: 'privileged' }));
  });

  it('marks a superseded comment obsolete without deleting it', async () => {
    const opinion = {
      _id: 'opinion-1',
      discussionContext: { status: 'potentially_obsolete', supersededByRevisionId: 'revision-2' },
      save: jest.fn().mockResolvedValue(undefined),
    };
    findOpinionById.mockResolvedValue(opinion);
    await request(createApp())
      .put('/api/moderation/comment-relevance?opinion=opinion-1')
      .send({ status: 'obsolete', reason: 'The corrected revision removes the disputed claim.' })
      .expect(200);
    expect(opinion.discussionContext.status).toBe('obsolete');
    expect(opinion.save).toHaveBeenCalledTimes(1);
    expect(findOpinionById).toHaveBeenCalledWith('opinion-1');
  });
});
