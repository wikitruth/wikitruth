'use strict';

import type { Router } from 'express';

import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import constants from '../../models/constants';
import { logEntryEvent } from '../../services/entryEventsService';
import { db, ensureReviewerOrAdmin, parseModerationTarget } from './moderationShared';
import { recordEntryRevision } from './revisionWriteRecorder';

export function registerModerationIssueRoutes(router: Router): void {
  router.put('/issue-resolution', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureReviewerOrAdmin(req, res)) return;
    const target = parseModerationTarget(req);
    if (!target || target.objectType !== constants.OBJECT_TYPES.issue) {
      res.status(400).json({ success: false, message: 'An issue target is required' });
      return;
    }
    const status = String(req.body?.status || '').trim().toLowerCase();
    const reason = String(req.body?.reason || '').trim();
    if (!['resolved', 'dismissed'].includes(status) || reason.length < 10) {
      res.status(400).json({ success: false, message: 'Resolved or dismissed status and a 10-character reason are required' });
      return;
    }
    const issue = await db.Issue.findById(target.id);
    if (!issue) {
      res.status(404).json({ success: false, message: 'Issue not found' });
      return;
    }
    issue.resolution = {
      status,
      reason,
      decisionDate: new Date(),
      decisionUserId: req.user?.id || req.user?._id,
      decisionUsername: String(req.user?.username || ''),
    };
    issue.editDate = new Date();
    issue.editUserId = req.user?.id || req.user?._id;
    await issue.save();
    await recordEntryRevision({ req, objectType: constants.OBJECT_TYPES.issue, entry: issue, source: 'update', summary: `Issue ${status}` });
    await logEntryEvent({
      scope: 'privileged',
      eventType: 'moderation.issue.resolved',
      objectType: constants.OBJECT_TYPES.issue,
      objectName: 'issue',
      objectId: target.id,
      actorUserId: String(req.user?.id || req.user?._id || ''),
      actorUsername: String(req.user?.username || ''),
      message: reason,
      payload: { status, ownerType: issue.ownerType, ownerId: issue.ownerId },
    });
    res.json({ success: true, resolution: issue.resolution });
  });

  router.put('/comment-relevance', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureReviewerOrAdmin(req, res)) return;
    const target = parseModerationTarget(req);
    if (!target || target.objectType !== constants.OBJECT_TYPES.opinion) {
      res.status(400).json({ success: false, message: 'A comment target is required' });
      return;
    }
    const status = String(req.body?.status || '').trim().toLowerCase();
    const reason = String(req.body?.reason || '').trim();
    if (!['relevant', 'obsolete'].includes(status) || reason.length < 10) {
      res.status(400).json({ success: false, message: 'Relevant or obsolete status and a 10-character reason are required' });
      return;
    }
    const comment = await db.Opinion.findById(target.id);
    if (!comment) {
      res.status(404).json({ success: false, message: 'Comment not found' });
      return;
    }
    comment.discussionContext = comment.discussionContext || {};
    comment.discussionContext.status = status;
    comment.discussionContext.reason = reason;
    comment.discussionContext.reviewedDate = new Date();
    comment.discussionContext.reviewedUserId = req.user?.id || req.user?._id;
    comment.editDate = new Date();
    comment.editUserId = req.user?.id || req.user?._id;
    await comment.save();
    await recordEntryRevision({ req, objectType: constants.OBJECT_TYPES.opinion, entry: comment, source: 'update', summary: `Comment marked ${status}` });
    await logEntryEvent({
      scope: 'privileged',
      eventType: 'moderation.comment.relevance-reviewed',
      objectType: constants.OBJECT_TYPES.opinion,
      objectName: 'opinion',
      objectId: target.id,
      actorUserId: String(req.user?.id || req.user?._id || ''),
      actorUsername: String(req.user?.username || ''),
      message: reason,
      payload: { status, supersededByRevisionId: comment.discussionContext.supersededByRevisionId || null },
    });
    res.json({ success: true, discussionContext: comment.discussionContext });
  });
}
