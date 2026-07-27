'use strict';

const express = require('express');
const request = require('supertest');

const findArtifactById = jest.fn();
const recordEntryRevision = jest.fn();
const logEntryEvent = jest.fn();
const inspectRemoteSource = jest.fn();
const queueKnowledgeReviewTask = jest.fn();

jest.mock('../../server/src/controllers/api/moderationShared', () => ({
  db: {
    Artifact: {
      findById: (...args) => findArtifactById(...args),
    },
  },
  ensureReviewerOrAdmin: (req, res) => {
    if (req.user?.canPlayRoleOf?.('reviewer') || req.user?.canPlayRoleOf?.('admin')) {
      return true;
    }
    res.status(403).json({ success: false, message: 'Reviewer or admin privileges required' });
    return false;
  },
  parseModerationTarget: (req) => req.query.artifact
    ? { objectType: 6, objectName: 'artifact', id: String(req.query.artifact) }
    : null,
}));

jest.mock('../../server/src/controllers/api/revisionWriteRecorder', () => ({
  recordEntryRevision: (...args) => recordEntryRevision(...args),
}));

jest.mock('../../server/src/services/entryEventsService', () => ({
  logEntryEvent: (...args) => logEntryEvent(...args),
}));
jest.mock('../../server/src/services/sourceIntegrityService', () => ({
  inspectRemoteSource: (...args) => inspectRemoteSource(...args),
}));
jest.mock('../../server/src/services/knowledgeReviewTaskService', () => ({
  queueKnowledgeReviewTask: (...args) => queueKnowledgeReviewTask(...args),
}));

function createApp(user) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  const router = express.Router();
  require('../../server/src/controllers/api/moderationArtifactRoutes').registerModerationArtifactRoutes(router);
  app.use('/api/moderation', router);
  return app;
}

describe('Artifact source-quality moderation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    recordEntryRevision.mockResolvedValue(undefined);
    logEntryEvent.mockResolvedValue(undefined);
    queueKnowledgeReviewTask.mockResolvedValue({});
    inspectRemoteSource.mockResolvedValue({
      status: 'healthy', checkedAt: new Date('2026-07-28T00:00:00.000Z'), nextCheckAt: new Date('2026-08-27T00:00:00.000Z'),
      httpStatus: 200, finalUrl: 'https://example.org/source', redirectCount: 0,
      contentHash: 'sha256:abc', expectedHash: '', hashMatches: null, contentType: 'text/html', contentLength: 120, error: '',
    });
  });

  it('requires reviewer or admin privileges', async () => {
    await request(createApp({ id: 'user-1', canPlayRoleOf: () => false }))
      .put('/api/moderation/artifact-quality?artifact=artifact-1')
      .send({ scores: { identity: 1, proximity: 1, integrity: 1, recency: 1, reproducibility: 1 } })
      .expect(403);
  });

  it('rejects missing or out-of-range rubric scores', async () => {
    const response = await request(createApp({ id: 'reviewer-1', canPlayRoleOf: (role) => role === 'reviewer' }))
      .put('/api/moderation/artifact-quality?artifact=artifact-1')
      .send({ scores: { identity: 5, proximity: 1, integrity: 1, recency: 1 } })
      .expect(400);

    expect(response.body.message).toMatch(/five source-quality scores/i);
    expect(findArtifactById).not.toHaveBeenCalled();
  });

  it('persists the five-dimension total with revision and audit evidence', async () => {
    const artifact = {
      _id: 'artifact-1',
      provenance: {},
      save: jest.fn().mockResolvedValue(undefined),
    };
    findArtifactById.mockResolvedValue(artifact);

    const response = await request(createApp({
      id: 'reviewer-1',
      username: 'reviewer',
      canPlayRoleOf: (role) => role === 'reviewer',
    }))
      .put('/api/moderation/artifact-quality?artifact=artifact-1')
      .send({
        scores: { identity: 4, proximity: 3, integrity: 4, recency: 2, reproducibility: 3 },
        notes: 'The source is identifiable and independently reproducible.',
      })
      .expect(200);

    expect(response.body.sourceQuality.total).toBe(16);
    expect(artifact.provenance.sourceQuality).toEqual(expect.objectContaining({
      identity: 4,
      proximity: 3,
      integrity: 4,
      recency: 2,
      reproducibility: 3,
      total: 16,
      reviewUsername: 'reviewer',
    }));
    expect(artifact.save).toHaveBeenCalledTimes(1);
    expect(recordEntryRevision).toHaveBeenCalledWith(expect.objectContaining({
      objectType: 6,
      source: 'update',
    }));
    expect(logEntryEvent).toHaveBeenCalledWith(expect.objectContaining({
      scope: 'privileged',
      eventType: 'artifact.source-quality.reviewed',
    }));
  });

  it('records a safe source check and schedules the next human review', async () => {
    const artifact = {
      _id: 'artifact-1', source: 'https://example.org/source', provenance: {},
      markModified: jest.fn(), save: jest.fn().mockResolvedValue(undefined),
    };
    findArtifactById.mockResolvedValue(artifact);
    const response = await request(createApp({
      id: 'reviewer-1', username: 'reviewer', canPlayRoleOf: (role) => role === 'reviewer',
    })).post('/api/moderation/artifact-source-check?artifact=artifact-1').send({}).expect(200);
    expect(response.body.sourceIntegrity.status).toBe('healthy');
    expect(inspectRemoteSource).toHaveBeenCalledWith(expect.objectContaining({ sourceUrl: 'https://example.org/source' }));
    expect(artifact.provenance.sourceIntegrity).toEqual(expect.objectContaining({ contentHash: 'sha256:abc' }));
    expect(queueKnowledgeReviewTask).toHaveBeenCalledWith(expect.objectContaining({ taskType: 'source_check' }));
    expect(recordEntryRevision).toHaveBeenCalledWith(expect.objectContaining({ summary: expect.stringContaining('healthy') }));
  });
});
