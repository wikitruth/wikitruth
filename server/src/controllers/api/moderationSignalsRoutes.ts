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
  parseModerationTarget,
  toNumber,
  mapLegacyVerdictToFactual,
} from './moderationShared';
import {
  computeChannelConsensus,
  consensusDecisionDetails,
  DEFAULT_VERDICT_CONSENSUS_POLICY,
  isVerdictChannel,
  isVoteStatusForChannel,
  type VerdictChannel,
} from '../../services/verdictConsensusService';
import { writeVerdictDecision } from './verdictDecisionWriter';

function validObjectIds(value: unknown): string[] {
  return Array.isArray(value)
    ? Array.from(new Set(value.map((id) => String(id || '').trim()).filter((id) => /^[a-f\d]{24}$/i.test(id))))
    : [];
}

function parseVote(req: WikitruthRequest): { value?: Record<string, unknown>; error?: string } {
  const body = req.body || {};
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
  if (channelStatus !== 'abstain' && rationale.length < 10) return { error: 'Vote rationale must be at least 10 characters' };
  if (channel === 'ethical' && !['abstain', 'not_applicable'].includes(channelStatus) && framework.length < 3) {
    return { error: 'An ethical framework or principle is required' };
  }
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) return { error: 'Confidence must be from 0 to 100' };
  if (conflictDeclared && conflictDetails.length < 5) return { error: 'Describe the declared conflict' };
  return {
    value: {
      channel,
      channelStatus,
      verdictStatus: channel === 'factual' ? numericLegacyStatus : null,
      rationale,
      framework,
      evidenceRefs: validObjectIds(body.evidenceRefs),
      confidence,
      expertise: String(body.expertise || '').trim(),
            conflictDeclared,
            conflictDetails,
            policyVersion: DEFAULT_VERDICT_CONSENSUS_POLICY.version,
            outcomeStatus: 'active',
            outcomeDate: null,
    },
  };
}

export function registerModerationSignalsRoutes(router: Router): void {
    router.post('/verdict-votes', async function (req: WikitruthRequest, res: WikitruthResponse) {
      if (!ensureReviewerOrAdmin(req, res)) {
        return;
      }
  
      const target = parseModerationTarget(req);
      if (!target) {
        res.status(400).json({ success: false, message: 'A moderation target is required' });
        return;
      }
  
      const parsed = parseVote(req);
      if (!parsed.value) {
        res.status(400).json({ success: false, message: parsed.error });
        return;
      }
      const voteInput = parsed.value;
      const voterUserId = String(req.user?._id || req.user?.id || '');
      const voterUsername = String(req.user?.username || '');
  
      const vote = await db.VerdictVote.findOneAndUpdate(
        {
          objectType: target.objectType,
          objectId: target.id,
          channel: voteInput.channel,
          voterUserId: voterUserId,
        },
        {
          $set: {
            objectType: target.objectType,
            objectName: target.objectName,
            objectId: target.id,
            ...voteInput,
            voterUserId: voterUserId,
            voterUsername: voterUsername,
            editDate: new Date(),
          },
          $setOnInsert: {
            createDate: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
  
      await logEntryEvent({
        eventType: 'moderation.verdict.vote',
        objectType: target.objectType,
        objectName: target.objectName,
        objectId: target.id,
        actorUserId: voterUserId,
        actorUsername: voterUsername,
        message: `${voteInput.channel} verdict vote submitted for ${voteInput.channelStatus}`,
        payload: voteInput,
      });
  
      const votes = await db.VerdictVote.find({
        objectType: target.objectType,
        objectId: target.id,
      }).lean();
      const channel = voteInput.channel as VerdictChannel;
      const consensus = computeChannelConsensus(channel, votes);
      let decision = { published: false } as Awaited<ReturnType<typeof writeVerdictDecision>>;
      if (consensus.reached && consensus.leadingStatus) {
        const details = consensusDecisionDetails(consensus, votes);
        decision = await writeVerdictDecision({
          req,
          target,
          channel,
          status: consensus.leadingStatus,
          reasoning: details.reasoning,
          framework: details.framework,
          evidenceRefs: details.evidenceRefs,
          decisionMode: 'consensus',
          policyVersion: consensus.policyVersion,
          consensusSnapshot: consensus,
        });
      }
  
      res.json({
        success: true,
        vote,
        summary: {
          ...consensus,
          consensusReached: consensus.reached,
          consensusStatus: consensus.leadingStatus,
        },
        decision,
      });
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
      const factual = computeChannelConsensus('factual', votes);
      const ethical = computeChannelConsensus('ethical', votes);
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
      const supportedSignalTypes = ['controversial', 'incorrect_verdict', 'needs_reevaluation', 'wrong_category'];
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
