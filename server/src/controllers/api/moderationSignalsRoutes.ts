'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import {
  bodyOf,
  queryOf,
  type ModerationListQueryContract,
  type ModerationStatusBodyContract,
} from '../../types/controllerContracts';

import { logEntryEvent } from '../../services/entryEventsService';
import { createNotification } from '../../services/notificationsService';
import {
  db,
  ensureReviewerOrAdmin,
  getDbModelByObjectType,
  parseModerationTarget,
  toNumber,
  mapLegacyVerdictToFactual,
} from './moderationShared';
import {
  computeChannelConsensus,
  consensusDecisionDetails,
  isVerdictChannel,
  isVoteStatusForChannel,
  verdictPolicyForSensitivity,
  type VerdictConsensusPolicy,
  type VerdictChannel,
} from '../../services/verdictConsensusService';
import { writeVerdictDecision } from './verdictDecisionWriter';
import { queueKnowledgeReviewTask } from '../../services/knowledgeReviewTaskService';
import { ensureCurrentRevision } from '../../services/entryRevisionService';
import { publishRealtimeEvent } from '../../services/realtimeEvents';

function validObjectIds(value: unknown): string[] {
  return Array.isArray(value)
    ? Array.from(new Set(value.map((id) => String(id || '').trim()).filter((id) => /^[a-f\d]{24}$/i.test(id))))
    : [];
}

function parseVoteBody(
  body: Record<string, unknown>,
  policy: VerdictConsensusPolicy,
): { value?: Record<string, unknown>; error?: string } {
  const numericLegacyStatus = toNumber(body.status ?? body.verdictStatus);
  const channel: VerdictChannel = isVerdictChannel(body.channel) ? body.channel : 'factual';
  const channelStatus = String(
    body.channelStatus || (numericLegacyStatus === null ? body.status : mapLegacyVerdictToFactual(numericLegacyStatus)),
  ).trim().toLowerCase();
  if (!isVoteStatusForChannel(channel, channelStatus)) return { error: `Unsupported ${channel} vote status` };

  const rationale = String(body.rationale || body.reasoning || '').trim();
  const framework = String(body.framework || '').trim();
  const conflictDeclared = body.conflictDeclared === true;
  const conflictDetails = String(body.conflictDetails || '').trim();
  const confidence = Number(body.confidence ?? 50);
  const expertise = String(body.expertise || '').trim();
  const affiliation = String(body.affiliation || '').trim();
  if (channelStatus !== 'abstain' && rationale.length < 10) return { error: 'Vote rationale must be at least 10 characters' };
  if (channel === 'ethical' && !['abstain', 'not_applicable'].includes(channelStatus) && framework.length < 3) {
    return { error: 'An ethical framework or principle is required' };
  }
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) return { error: 'Confidence must be from 0 to 100' };
  if (conflictDeclared && conflictDetails.length < 5) return { error: 'Describe the declared conflict' };
  const eligibilityReasons = [
    ...(policy.requireExpertise && expertise.length < 3 ? ['Relevant expertise is required for this sensitivity'] : []),
    ...(policy.requireAffiliation && affiliation.length < 2 ? ['Reviewer affiliation is required for this sensitivity'] : []),
  ];
  return {
    value: {
      channel,
      channelStatus,
      verdictStatus: channel === 'factual' ? numericLegacyStatus : null,
      rationale,
      framework,
      evidenceRefs: validObjectIds(body.evidenceRefs),
      confidence,
      expertise,
      affiliation,
      eligibilityStatus: eligibilityReasons.length ? 'ineligible' : 'eligible',
      eligibilityReason: eligibilityReasons.join('; '),
      conflictDeclared,
      conflictDetails,
      policyVersion: policy.version,
      outcomeStatus: 'active',
      outcomeDate: null,
    },
  };
}

function parseVote(req: WikitruthRequest, policy: VerdictConsensusPolicy) {
  return parseVoteBody((req.body || {}) as Record<string, unknown>, policy);
}

function normalizedRevisionId(value: unknown): string {
  return String(value || '').trim().replace(/^W\//, '').replace(/^"|"$/g, '');
}

async function policyForTarget(target: { objectType: number; id: string }): Promise<VerdictConsensusPolicy> {
  const model = getDbModelByObjectType(target.objectType);
  if (!model?.findById) return verdictPolicyForSensitivity('standard');
  const entry = await model.findById(target.id).select('extras.verdictSensitivity').lean();
  return verdictPolicyForSensitivity(entry?.extras?.verdictSensitivity);
}

async function persistHumanVote(
  req: WikitruthRequest,
  target: { objectType: number; objectName: string; id: string },
  voteInput: Record<string, unknown>,
  policy: VerdictConsensusPolicy,
  sourceAdviceId?: string,
) {
  const voterUserId = String(req.user?._id || req.user?.id || '');
  const voterUsername = String(req.user?.username || '');
  const vote = await db.VerdictVote.findOneAndUpdate(
    { objectType: target.objectType, objectId: target.id, channel: voteInput.channel, voterUserId },
    {
      $set: {
        objectType: target.objectType, objectName: target.objectName, objectId: target.id,
        ...voteInput, voterUserId, voterUsername, sourceAdviceId: sourceAdviceId || null, editDate: new Date(),
      },
      $setOnInsert: { createDate: new Date() },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  await logEntryEvent({
    eventType: sourceAdviceId ? 'moderation.verdict.advice_countersigned' : 'moderation.verdict.vote',
    objectType: target.objectType,
    objectName: target.objectName,
    objectId: target.id,
    actorUserId: voterUserId,
    actorUsername: voterUsername,
    message: `${voteInput.channel} verdict vote submitted for ${voteInput.channelStatus}`,
    payload: { ...voteInput, sourceAdviceId: sourceAdviceId || null },
  });

  const votes = await db.VerdictVote.find({ objectType: target.objectType, objectId: target.id }).lean();
  const channel = voteInput.channel as VerdictChannel;
  const consensus = computeChannelConsensus(channel, votes, policy);
  let decision = { published: false } as Awaited<ReturnType<typeof writeVerdictDecision>>;
  if (consensus.reached && consensus.leadingStatus) {
    const details = consensusDecisionDetails(consensus, votes, policy);
    decision = await writeVerdictDecision({
      req, target, channel, status: consensus.leadingStatus,
      reasoning: details.reasoning, framework: details.framework, evidenceRefs: details.evidenceRefs,
      decisionMode: 'consensus', policyVersion: consensus.policyVersion, consensusSnapshot: consensus,
    });
    await db.KnowledgeReviewTask?.updateOne?.(
      { taskType: 'quorum_gap', objectType: target.objectType, objectId: target.id, channel },
      { $set: { status: 'completed', completedDate: new Date(), editDate: new Date() } },
    );
  } else {
    await queueKnowledgeReviewTask({
      taskType: 'quorum_gap', objectType: target.objectType, objectName: target.objectName,
      objectId: target.id, channel, dueAt: new Date(),
      priority: policy.sensitivity === 'standard' ? 'normal' : policy.sensitivity,
      reason: `${channel} review has ${consensus.eligibleVotes} eligible vote(s) and has not reached quorum`,
      metadata: { summary: consensus },
    });
  }
  return {
    vote,
    summary: { ...consensus, consensusReached: consensus.reached, consensusStatus: consensus.leadingStatus },
    decision,
  };
}

export function registerModerationSignalsRoutes(router: Router): void {
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
        res.json({ success: true, advice: resolved, eligibleVoteCreated: true, ...result });
      } catch (error) {
        await db.VerdictAdvice.updateOne(
          { _id: advice._id, status: 'reviewing' },
          { $set: { status: 'pending' }, $unset: { decisionNote: 1, decisionUserId: 1, decisionUsername: 1, decisionDate: 1 } },
        );
        throw error;
      }
    });

    router.post('/verdict-votes', async function (req: WikitruthRequest, res: WikitruthResponse) {
      if (req.apiClient) {
        res.status(403).json({ success: false, message: 'Agent analysis must use verdict advice and requires human countersign' });
        return;
      }
      if (!ensureReviewerOrAdmin(req, res)) {
        return;
      }
  
      const target = parseModerationTarget(req);
      if (!target) {
        res.status(400).json({ success: false, message: 'A moderation target is required' });
        return;
      }

      const policy = await policyForTarget(target);
      const parsed = parseVote(req, policy);
      if (!parsed.value) {
        res.status(400).json({ success: false, message: parsed.error });
        return;
      }
      res.json({ success: true, ...await persistHumanVote(req, target, parsed.value, policy) });
    });
  
    router.get('/verdict-votes', async function (req: WikitruthRequest, res: WikitruthResponse) {
      if (!ensureReviewerOrAdmin(req, res)) {
        return;
      }
  
      const target = parseModerationTarget(req);
      if (!target) {
        res.status(400).json({ success: false, message: 'A moderation target is required' });
        return;
      }
  
      const voteQuery: Record<string, unknown> = {
        objectType: target.objectType,
        objectId: target.id,
      };
      if (isVerdictChannel(req.query.channel)) voteQuery.channel = req.query.channel;
      const votes = await db.VerdictVote.find(voteQuery)
        .sort({ createDate: 1 })
        .lean();
      const policy = await policyForTarget(target);
      const factual = computeChannelConsensus('factual', votes, policy);
      const ethical = computeChannelConsensus('ethical', votes, policy);
      const selected = req.query.channel === 'ethical' ? ethical : factual;
  
      res.json({
        success: true,
        votes,
        summary: {
          ...selected,
          consensusReached: selected.reached,
          consensusStatus: selected.leadingStatus,
        },
        channels: { factual, ethical },
      });
    });
  
    router.post('/signals', async function (req: WikitruthRequest, res: WikitruthResponse) {
      if (!req.user?._id && !req.user?.id) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }
  
      const target = parseModerationTarget(req);
      if (!target) {
        res.status(400).json({ success: false, message: 'A moderation target is required' });
        return;
      }
  
      const body = bodyOf<ModerationStatusBodyContract>(req);
      const signalType = String(body.signalType || '').trim();
      const supportedSignalTypes = ['controversial', 'incorrect_verdict', 'needs_reevaluation', 'wrong_category', 'duplicate'];
      if (!supportedSignalTypes.includes(signalType)) {
        res.status(400).json({ success: false, message: 'Unsupported signalType' });
        return;
      }
  
      const note = String(body.note || '').trim();
      const signal = await db.ReaderSignal.create({
        objectType: target.objectType,
        objectName: target.objectName,
        objectId: target.id,
        signalType,
        note,
        status: 'open',
        createUserId: String(req.user?._id || req.user?.id || ''),
        createUsername: String(req.user?.username || ''),
        createDate: new Date(),
        editDate: new Date(),
      });
  
      await logEntryEvent({
        eventType: 'moderation.reader-signal.created',
        objectType: target.objectType,
        objectName: target.objectName,
        objectId: target.id,
        actorUserId: String(req.user?._id || req.user?.id || ''),
        actorUsername: String(req.user?.username || ''),
        message: `Reader signal submitted: ${signalType}`,
        payload: { signalType, note },
      });
  
      const reviewerUsers = await db.User.find({
        $or: [{ 'roles.reviewer': true }, { 'roles.admin': { $ne: null } }],
      })
        .select('_id')
        .lean();
  
      await Promise.all(
        reviewerUsers
          .map((reviewer: { _id?: unknown }) => String(reviewer._id || '').trim())
          .filter(Boolean)
          .map((reviewerId: string) =>
            createNotification({
              userId: reviewerId,
              type: 'reader_signal',
              title: 'New reader signal',
              body: `${target.objectName} was flagged as ${signalType.replace('_', ' ')}.`,
              link: `/admin/moderation/signals?type=signals`,
              target: {
                objectType: target.objectType,
                objectName: target.objectName,
                objectId: target.id,
              },
              payload: { signalId: String(signal._id || '') },
            })
          )
      );
  
      res.status(201).json({
        success: true,
        signal,
      });
    });
  
    router.get('/signals', async function (req: WikitruthRequest, res: WikitruthResponse) {
      if (!ensureReviewerOrAdmin(req, res)) {
        return;
      }
  
      const requestQuery = queryOf<ModerationListQueryContract>(req);
      const status = String(requestQuery.status || '').trim();
      const signalType = String(requestQuery.signalType || '').trim();
      const query: Record<string, unknown> = {};
      if (status) {
        query.status = status;
      }
      if (signalType) {
        query.signalType = signalType;
      }
  
      const signals = await db.ReaderSignal.find(query).sort({ createDate: -1 }).limit(200).lean();
      res.json({
        success: true,
        signals,
      });
    });
  
    router.put('/signals/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
      if (!ensureReviewerOrAdmin(req, res)) {
        return;
      }
  
      const signal = await db.ReaderSignal.findById(req.params.id);
      if (!signal) {
        res.status(404).json({ success: false, message: 'Signal not found' });
        return;
      }
  
      const body = bodyOf<ModerationStatusBodyContract>(req);
      const status = String(body.status || '').trim();
      const resolutionNote = String(body.resolutionNote || '').trim();
      if (status) {
        signal.status = status;
      }
      if (resolutionNote) {
        signal.resolutionNote = resolutionNote;
      }
      signal.assignedUserId = String(req.user?._id || req.user?.id || '');
      signal.editDate = new Date();
      await signal.save();
  
      res.json({
        success: true,
        signal: signal.toObject(),
      });
    });
  
    router.post('/appeals', async function (req: WikitruthRequest, res: WikitruthResponse) {
      if (!req.user?._id && !req.user?.id) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }
  
      const target = parseModerationTarget(req);
      if (!target) {
        res.status(400).json({ success: false, message: 'A moderation target is required' });
        return;
      }
  
      const body = bodyOf<ModerationStatusBodyContract>(req);
      const reasonType = String(body.reasonType || 'general').trim();
      const note = String(body.note || '').trim();
      if (!note || note.length < 6) {
        res.status(400).json({ success: false, message: 'Appeal note must be at least 6 characters' });
        return;
      }
  
      const appeal = await db.Appeal.create({
        objectType: target.objectType,
        objectName: target.objectName,
        objectId: target.id,
        reasonType,
        note,
        status: 'open',
        createUserId: String(req.user?._id || req.user?.id || ''),
        createUsername: String(req.user?.username || ''),
        createDate: new Date(),
        editDate: new Date(),
      });
  
      await logEntryEvent({
        eventType: 'moderation.appeal.created',
        objectType: target.objectType,
        objectName: target.objectName,
        objectId: target.id,
        actorUserId: String(req.user?._id || req.user?.id || ''),
        actorUsername: String(req.user?.username || ''),
        message: `Appeal created (${reasonType})`,
        payload: { reasonType, note },
      });
  
      res.status(201).json({
        success: true,
        appeal,
      });
    });
  
    router.get('/appeals', async function (req: WikitruthRequest, res: WikitruthResponse) {
      if (!ensureReviewerOrAdmin(req, res)) {
        return;
      }
  
      const requestQuery = queryOf<ModerationListQueryContract>(req);
      const status = String(requestQuery.status || '').trim();
      const reasonType = String(requestQuery.reasonType || '').trim();
      const query: Record<string, unknown> = {};
      if (status) {
        query.status = status;
      }
      if (reasonType) {
        query.reasonType = reasonType;
      }
  
      const appeals = await db.Appeal.find(query).sort({ createDate: -1 }).limit(200).lean();
      res.json({
        success: true,
        appeals,
      });
    });
  
    router.put('/appeals/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
      if (!ensureReviewerOrAdmin(req, res)) {
        return;
      }
  
      const appeal = await db.Appeal.findById(req.params.id);
      if (!appeal) {
        res.status(404).json({ success: false, message: 'Appeal not found' });
        return;
      }
  
      const body = bodyOf<ModerationStatusBodyContract>(req);
      const status = String(body.status || '').trim();
      const resolutionNote = String(body.resolutionNote || '').trim();
      if (status) {
        appeal.status = status;
      }
      if (resolutionNote) {
        appeal.resolutionNote = resolutionNote;
      }
      appeal.assignedReviewerId = String(req.user?._id || req.user?.id || '');
      appeal.editDate = new Date();
      await appeal.save();
  
      res.json({
        success: true,
        appeal: appeal.toObject(),
      });
    });
}
