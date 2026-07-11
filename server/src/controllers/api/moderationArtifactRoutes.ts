'use strict';

import type { Router } from 'express';

import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import constants from '../../models/constants';
import { logEntryEvent } from '../../services/entryEventsService';
import {
  db,
  ensureReviewerOrAdmin,
  parseModerationTarget,
} from './moderationShared';
import { recordEntryRevision } from './revisionWriteRecorder';

const SCORE_FIELDS = ['identity', 'proximity', 'integrity', 'recency', 'reproducibility'] as const;

function parseScores(value: unknown): Record<(typeof SCORE_FIELDS)[number], number> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const input = value as Record<string, unknown>;
  const scores = {} as Record<(typeof SCORE_FIELDS)[number], number>;
  for (const field of SCORE_FIELDS) {
    const score = Number(input[field]);
    if (!Number.isInteger(score) || score < 0 || score > 4) {
      return null;
    }
    scores[field] = score;
  }
  return scores;
}

export function registerModerationArtifactRoutes(router: Router): void {
  router.put('/artifact-quality', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureReviewerOrAdmin(req, res)) {
      return;
    }
    const target = parseModerationTarget(req);
    if (!target || target.objectType !== constants.OBJECT_TYPES.artifact) {
      res.status(400).json({ success: false, message: 'An artifact target is required' });
      return;
    }
    const scores = parseScores(req.body?.scores);
    if (!scores) {
      res.status(400).json({ success: false, message: 'All five source-quality scores must be integers from 0 to 4' });
      return;
    }
    const artifact = await db.Artifact.findById(target.id);
    if (!artifact) {
      res.status(404).json({ success: false, message: 'Artifact not found' });
      return;
    }
    const total = SCORE_FIELDS.reduce((sum, field) => sum + scores[field], 0);
    artifact.provenance = artifact.provenance || {};
    artifact.provenance.sourceQuality = {
      ...scores,
      total,
      notes: String(req.body?.notes || '').trim(),
      reviewDate: new Date(),
      reviewUserId: req.user?.id || req.user?._id,
      reviewUsername: String(req.user?.username || ''),
    };
    artifact.editDate = new Date();
    artifact.editUserId = req.user?.id || req.user?._id;
    await artifact.save();
    await recordEntryRevision({
      req,
      objectType: constants.OBJECT_TYPES.artifact,
      entry: artifact,
      source: 'update',
      summary: 'Artifact source quality reviewed',
    });
    await logEntryEvent({
      scope: 'privileged',
      eventType: 'artifact.source-quality.reviewed',
      objectType: constants.OBJECT_TYPES.artifact,
      objectName: 'artifact',
      objectId: target.id,
      actorUserId: String(req.user?.id || req.user?._id || ''),
      actorUsername: String(req.user?.username || ''),
      message: `Artifact source quality scored ${total}/20`,
      payload: { scores, total },
    });
    res.json({
      success: true,
      sourceQuality: artifact.provenance.sourceQuality,
    });
  });
}
