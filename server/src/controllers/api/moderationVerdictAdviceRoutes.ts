'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import { logEntryEvent } from '../../services/entryEventsService';
import { createNotification } from '../../services/notificationsService';
import { db, ensureReviewerOrAdmin, parseModerationTarget } from './moderationShared';
import { isVerdictChannel } from '../../services/verdictConsensusService';
import { ensureCurrentRevision } from '../../services/entryRevisionService';
import { publishRealtimeEvent } from '../../services/realtimeEvents';
import { recordAgentOperationEvent } from '../../services/agentObservabilityService';
import {
  normalizedRevisionId,
  parseVote,
  parseVoteBody,
  persistHumanVote,
  policyForTarget,
} from './moderationVerdictService';

export function registerModerationVerdictAdviceRoutes(router: Router): void {
  router.post('/verdict-advice', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!req.apiClient) {
      res.status(400).json({ success: false, message: 'Verdict advice is reserved for attributed agent analysis; people should submit a verdict vote' });
      return;
    }
    if (!ensureReviewerOrAdmin(req, res)) return;
    const target = parseModerationTarget(req);
    if (!target) {
      res.status(400).json({ success: false, message: 'A moderation target is required' });
      return;
    }
    const expectedBaseRevisionId = normalizedRevisionId(
      req.get('if-match') || req.body?.baseRevisionId || req.body?.baseRevision,
    );
    if (!expectedBaseRevisionId) {
      res.status(428).json({ success: false, message: 'Verdict advice requires If-Match or baseRevisionId' });
      return;
    }
    const policy = await policyForTarget(target);
    const parsed = parseVote(req, policy);
    if (!parsed.value) {
      res.status(400).json({ success: false, message: parsed.error });
      return;
    }
    try {
      const baseRevision = await ensureCurrentRevision({ objectType: target.objectType, objectId: target.id });
      if (String(baseRevision._id || '') !== expectedBaseRevisionId) {
        res.status(409).json({ success: false, message: 'Base revision is stale because the entry has a newer revision' });
        return;
      }
      const advice = await db.VerdictAdvice.create({
        objectType: target.objectType, objectName: target.objectName, objectId: target.id,
        baseRevisionId: baseRevision._id,
        baseRevisionNumber: Number(baseRevision.revisionNumber || 0),
        baseSnapshotHash: String(baseRevision.snapshotHash || ''),
        ...parsed.value,
        status: 'pending',
        apiClientId: req.apiClient.id,
        apiClientName: req.apiClient.name,
        agentRunId: req.agentRun?.runId || '',
        agentModel: req.agentRun?.model || '',
        agentProvider: req.agentRun?.provider || '',
        agentPurpose: req.agentRun?.purpose || '',
        sourceManifest: req.agentRun?.sourceManifest || [],
        createUserId: String(req.user?._id || req.user?.id || ''),
        createUsername: String(req.user?.username || ''),
        createDate: new Date(),
      });
      await logEntryEvent({
        eventType: 'agent.verdict.advice_created',
        objectType: target.objectType, objectName: target.objectName, objectId: target.id,
        actorUserId: String(req.user?._id || req.user?.id || ''),
        actorUsername: String(req.user?.username || ''),
        message: `${req.apiClient.name} submitted ${parsed.value.channel} verdict advice`,
        payload: {
          adviceId: String(advice._id || ''), apiClientId: req.apiClient.id,
          agentRunId: req.agentRun?.runId || '', baseRevisionId: String(baseRevision._id || ''),
          channel: parsed.value.channel, channelStatus: parsed.value.channelStatus,
        },
      });
      publishRealtimeEvent({
        type: 'agent.verdict.advice_created',
        data: {
          apiClientId: req.apiClient.id, agentRunId: req.agentRun?.runId || '',
          adviceId: String(advice._id || ''), objectType: target.objectType, objectId: target.id,
          status: 'pending',
        },
      });
      recordAgentOperationEvent(req.app, {
        kind: 'advice_submitted', apiClientId: req.apiClient.id, clientId: req.apiClient.clientId,
        agentRunId: req.agentRun?.runId || '', operationId: 'moderation.verdict-advice.create',
        code: 'VERDICT_ADVICE_SUBMITTED', metadata: { adviceId: String(advice._id || ''), channel: parsed.value.channel },
      });
      if (db.User?.find) {
        const reviewers = await db.User.find({
          $or: [{ 'roles.reviewer': true }, { 'roles.admin': { $ne: null } }],
        }).select('_id').lean();
        await Promise.all(reviewers.map((reviewer: { _id?: unknown }) => String(reviewer._id || '')).filter(Boolean)
          .map((reviewerId: string) => createNotification({
            userId: reviewerId,
            type: 'verdict_advice',
            title: 'Agent verdict analysis awaiting review',
            body: `${req.apiClient!.name} submitted attributed ${String(parsed.value?.channel || '')} analysis.`,
            link: `/admin/verdicts/${encodeURIComponent(target.id)}?type=${encodeURIComponent(target.objectName)}`,
            target,
            payload: { adviceId: String(advice._id || ''), apiClientId: req.apiClient!.id },
          })));
      }
      res.status(201).json({ success: true, advisory: true, eligibleVoteCreated: false, advice });
    } catch (error) {
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Unable to create verdict advice' });
    }
  });

  router.get('/verdict-advice', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureReviewerOrAdmin(req, res)) return;
    const target = parseModerationTarget(req);
    const query: Record<string, unknown> = {};
    if (target) Object.assign(query, { objectType: target.objectType, objectId: target.id });
    if (String(req.query.status || '').trim()) query.status = String(req.query.status).trim();
    if (isVerdictChannel(req.query.channel)) query.channel = req.query.channel;
    const advice = await db.VerdictAdvice.find(query).sort({ createDate: -1 }).limit(100).lean();
    res.json({ success: true, advice });
  });

  router.put('/verdict-advice/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (req.apiClient) {
      res.status(403).json({ success: false, message: 'A human reviewer must resolve verdict advice' });
      return;
    }
    if (!ensureReviewerOrAdmin(req, res)) return;
    const action = String(req.body?.action || '').trim().toLowerCase();
    const decisionNote = String(req.body?.decisionNote || '').trim();
    if (!['countersign', 'reject'].includes(action) || decisionNote.length < 5) {
      res.status(400).json({ success: false, message: 'Action must be countersign or reject with a decision note of at least 5 characters' });
      return;
    }
    const advice = await db.VerdictAdvice.findById(req.params.id).lean();
    if (!advice) {
      res.status(404).json({ success: false, message: 'Verdict advice not found' });
      return;
    }
    if (advice.status !== 'pending') {
      res.status(409).json({ success: false, message: 'Verdict advice is no longer pending' });
      return;
    }
    const decision = {
      decisionNote, decisionUserId: String(req.user?._id || req.user?.id || ''),
      decisionUsername: String(req.user?.username || ''), decisionDate: new Date(),
    };
    if (action === 'reject') {
      const rejected = await db.VerdictAdvice.findOneAndUpdate(
        { _id: advice._id, status: 'pending' }, { $set: { status: 'rejected', ...decision } }, { new: true },
      ).lean();
      if (!rejected) {
        res.status(409).json({ success: false, message: 'Verdict advice was resolved concurrently' });
        return;
      }
      await logEntryEvent({
        scope: 'privileged', eventType: 'moderation.verdict.advice_rejected',
        objectType: Number(advice.objectType), objectName: String(advice.objectName || ''), objectId: String(advice.objectId || ''),
        actorUserId: decision.decisionUserId, actorUsername: decision.decisionUsername,
        message: decisionNote, payload: { adviceId: String(advice._id || ''), status: 'rejected' },
      });
      publishRealtimeEvent({
        type: 'agent.verdict.advice_resolved',
        data: {
          apiClientId: String(advice.apiClientId || ''), agentRunId: String(advice.agentRunId || ''),
          adviceId: String(advice._id || ''), status: 'rejected', eligibleVoteCreated: false,
        },
      });
      recordAgentOperationEvent(req.app, {
        kind: 'advice_rejected', apiClientId: String(advice.apiClientId || ''), agentRunId: String(advice.agentRunId || ''),
        operationId: 'moderation.verdict-advice.review', code: 'VERDICT_ADVICE_REJECTED', metadata: { adviceId: String(advice._id || '') },
      });
      res.json({ success: true, advice: rejected, eligibleVoteCreated: false });
      return;
    }

    const target = { objectType: Number(advice.objectType), objectName: String(advice.objectName || ''), id: String(advice.objectId || '') };
    const latest = await ensureCurrentRevision({ objectType: target.objectType, objectId: target.id });
    if (String(latest._id || '') !== String(advice.baseRevisionId || '')) {
      await db.VerdictAdvice.updateOne(
        { _id: advice._id, status: 'pending' }, { $set: { status: 'stale', ...decision } },
      );
      publishRealtimeEvent({
        type: 'agent.verdict.advice_resolved',
        data: {
          apiClientId: String(advice.apiClientId || ''), agentRunId: String(advice.agentRunId || ''),
          adviceId: String(advice._id || ''), status: 'stale', eligibleVoteCreated: false,
        },
      });
      recordAgentOperationEvent(req.app, {
        kind: 'advice_stale', apiClientId: String(advice.apiClientId || ''), agentRunId: String(advice.agentRunId || ''),
        operationId: 'moderation.verdict-advice.review', code: 'VERDICT_ADVICE_STALE', metadata: { adviceId: String(advice._id || '') },
      });
      res.status(409).json({ success: false, message: 'Verdict advice is stale because the entry has a newer revision' });
      return;
    }
    const policy = await policyForTarget(target);
    const parsed = parseVoteBody({
      ...advice,
      expertise: req.body?.expertise || '', affiliation: req.body?.affiliation || '',
      conflictDeclared: req.body?.conflictDeclared === true,
      conflictDetails: req.body?.conflictDetails || '',
    }, policy);
    if (!parsed.value) {
      res.status(400).json({ success: false, message: parsed.error });
      return;
    }
    const locked = await db.VerdictAdvice.findOneAndUpdate(
      { _id: advice._id, status: 'pending' }, { $set: { status: 'reviewing', ...decision } }, { new: true },
    ).lean();
    if (!locked) {
      res.status(409).json({ success: false, message: 'Verdict advice was resolved concurrently' });
      return;
    }
    try {
      const result = await persistHumanVote(req, target, parsed.value, policy, String(advice._id || ''));
      const resolved = await db.VerdictAdvice.findOneAndUpdate(
        { _id: advice._id, status: 'reviewing' },
        { $set: { status: 'countersigned', resultingVoteId: result.vote?._id || null, ...decision } },
        { new: true },
      ).lean();
      publishRealtimeEvent({
        type: 'agent.verdict.advice_resolved',
        data: {
          apiClientId: String(advice.apiClientId || ''), agentRunId: String(advice.agentRunId || ''),
          adviceId: String(advice._id || ''), status: 'countersigned', eligibleVoteCreated: true,
          voteId: String(result.vote?._id || ''),
        },
      });
      recordAgentOperationEvent(req.app, {
        kind: 'advice_countersigned', apiClientId: String(advice.apiClientId || ''), agentRunId: String(advice.agentRunId || ''),
        operationId: 'moderation.verdict-advice.review', code: 'VERDICT_ADVICE_COUNTERSIGNED', metadata: { adviceId: String(advice._id || ''), voteId: String(result.vote?._id || '') },
      });
      res.json({ success: true, advice: resolved, eligibleVoteCreated: true, ...result });
    } catch (error) {
      await db.VerdictAdvice.updateOne(
        { _id: advice._id, status: 'reviewing' },
        { $set: { status: 'pending' }, $unset: { decisionNote: 1, decisionUserId: 1, decisionUsername: 1, decisionDate: 1 } },
      );
      throw error;
    }
  });
}
