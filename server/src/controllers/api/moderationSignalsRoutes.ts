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
} from './moderationShared';
import {
  computeChannelConsensus,
  isVerdictChannel,
} from '../../services/verdictConsensusService';
import { registerModerationVerdictAdviceRoutes } from './moderationVerdictAdviceRoutes';
import { parseVote, persistHumanVote, policyForTarget } from './moderationVerdictService';

export function registerModerationSignalsRoutes(router: Router): void {
    registerModerationVerdictAdviceRoutes(router);

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
