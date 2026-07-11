'use strict';

import type { WikitruthRequest, WikitruthResponse } from '../types/http';
import appModForDb from '../app';
import constants from '../models/constants';
import { logEntryEvent } from './entryEventsService';

const CRITICAL_ISSUE_TYPES = [10, 20, 30, 40, 45];
type IssueModel = {
  countDocuments(query: Record<string, unknown>): Promise<number>;
};
const db = (appModForDb as unknown as { db: { models: { Issue?: IssueModel } } }).db.models;

export async function countBlockingIssues(objectType: number, objectId: string): Promise<number> {
  if (!db.Issue || !objectId) {
    return 0;
  }
  return db.Issue.countDocuments({
    ownerType: objectType,
    ownerId: objectId,
    issueType: { $in: CRITICAL_ISSUE_TYPES },
    'screening.status': constants.SCREENING_STATUS.status1.code,
    'resolution.status': { $nin: ['resolved', 'dismissed'] },
  });
}

export async function enforceIssueFirstGate(options: {
  req: WikitruthRequest;
  res: WikitruthResponse;
  objectType: number;
  objectName: string;
  objectId: string;
  action: 'discussion' | 'factual_verdict';
}): Promise<boolean> {
  const blockingCount = await countBlockingIssues(options.objectType, options.objectId);
  if (!blockingCount) {
    return true;
  }
  const overrideReason = String(options.req.body?.issueGateOverrideReason || '').trim();
  const isAdmin = Boolean(options.req.user?.canPlayRoleOf?.('admin'));
  if (isAdmin && overrideReason.length >= 10) {
    await logEntryEvent({
      scope: 'privileged',
      eventType: 'moderation.issue-gate.overridden',
      objectType: options.objectType,
      objectName: options.objectName,
      objectId: options.objectId,
      actorUserId: String(options.req.user?.id || options.req.user?._id || ''),
      actorUsername: String(options.req.user?.username || ''),
      message: overrideReason,
      payload: { action: options.action, blockingCount },
    });
    return true;
  }
  options.res.status(409).json({
    success: false,
    code: 'CRITICAL_ISSUES_BLOCK_ACTION',
    message: options.action === 'discussion'
      ? 'Resolve accepted critical issues before continuing this discussion'
      : 'Resolve accepted critical issues before assigning a final factual verdict',
    blockingIssueCount: blockingCount,
    overrideAvailable: isAdmin,
  });
  return false;
}
