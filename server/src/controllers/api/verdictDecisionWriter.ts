'use strict';

import type { WikitruthRequest } from '../../types/http';
import constants from '../../models/constants';
import { logEntryEvent } from '../../services/entryEventsService';
import { notifySubscribers } from '../../services/notificationsService';
import { countBlockingIssues } from '../../services/issueGateService';
import type { VerdictChannel, VerdictConsensusSummary } from '../../services/verdictConsensusService';
import { recordEntryRevision } from './revisionWriteRecorder';
import { queueKnowledgeReviewTask } from '../../services/knowledgeReviewTaskService';
import { db, getDbModelByObjectType, mapFactualVerdictToLegacy, toModerationEntry } from './moderationShared';

type DecisionMode = 'consensus' | 'admin_override';

type VerdictDecisionInput = {
  req: WikitruthRequest;
  target: { objectType: number; objectName: string; id: string };
  channel: VerdictChannel;
  status: string;
  reasoning: string;
  framework?: string;
  evidenceRefs?: string[];
  decisionMode: DecisionMode;
  policyVersion: string;
  overrideReason?: string;
  consensusSnapshot: VerdictConsensusSummary;
};

export type VerdictDecisionResult = {
  published: boolean;
  blockedByIssues?: number;
  entry?: Record<string, unknown>;
};

function entryLink(objectName: string, entry: Record<string, unknown>, id: string): string {
  const friendly = encodeURIComponent(String(entry.friendlyUrl || id));
  return objectName === 'answer'
    ? `/answers/entry/${encodeURIComponent(id)}`
    : `/${objectName}s/entry/${friendly}/${encodeURIComponent(id)}`;
}

export async function writeVerdictDecision(input: VerdictDecisionInput): Promise<VerdictDecisionResult> {
  const blockingIssues = input.channel === 'factual'
    && !['pending', 'insufficient_evidence'].includes(input.status)
    ? await countBlockingIssues(input.target.objectType, input.target.id)
    : 0;
  if (blockingIssues && input.decisionMode !== 'admin_override') {
    return { published: false, blockedByIssues: blockingIssues };
  }

  const model = getDbModelByObjectType(input.target.objectType);
  const entry = model ? await model.findById(input.target.id) : null;
  if (!entry) return { published: false };

  const now = new Date();
  const revalidateAt = new Date(now.getTime() + input.consensusSnapshot.revalidationIntervalDays * 24 * 60 * 60 * 1000);
  const actorUserId = input.req.user?.id || input.req.user?._id;
  entry.verdicts = entry.verdicts || {};
  entry.verdicts[input.channel] = {
    ...(entry.verdicts[input.channel] || {}),
    status: input.status,
    reasoning: input.reasoning,
    ...(input.channel === 'ethical' ? { framework: input.framework || '' } : {}),
    evidenceRefs: input.evidenceRefs || [],
    decisionMode: input.decisionMode,
    policyVersion: input.policyVersion,
    sensitivity: input.consensusSnapshot.sensitivity,
    revalidateAt,
    overrideReason: input.decisionMode === 'admin_override' ? input.overrideReason || '' : '',
    consensusSnapshot: input.consensusSnapshot,
    editDate: now,
    editUserId: actorUserId,
  };
  if (input.channel === 'factual') {
    entry.verdict = {
      ...(entry.verdict || {}),
      status: mapFactualVerdictToLegacy(input.status),
      reasoning: input.reasoning,
      editDate: now,
      editUserId: actorUserId,
    };
  }
  entry.editDate = now;
  entry.editUserId = actorUserId;
  await entry.save();
  await queueKnowledgeReviewTask({
    taskType: 'revalidation', objectType: input.target.objectType, objectName: input.target.objectName,
    objectId: input.target.id, channel: input.channel, dueAt: revalidateAt,
    priority: input.consensusSnapshot.sensitivity === 'standard' ? 'normal' : input.consensusSnapshot.sensitivity,
    reason: `${input.channel} verdict requires scheduled revalidation`,
    metadata: { policyVersion: input.policyVersion, decisionMode: input.decisionMode, status: input.status },
  });

  const voteOutcome = input.status === 'pending' ? 'superseded' : 'upheld';
  await db.VerdictVote.updateMany(
    { objectType: input.target.objectType, objectId: input.target.id, channel: input.channel },
    { $set: { outcomeStatus: 'superseded', outcomeDate: now } },
  );
  if (voteOutcome === 'upheld') {
    await db.VerdictVote.updateMany(
      {
        objectType: input.target.objectType,
        objectId: input.target.id,
        channel: input.channel,
        channelStatus: input.status,
        conflictDeclared: { $ne: true },
      },
      { $set: { outcomeStatus: 'upheld', outcomeDate: now } },
    );
    if (input.decisionMode === 'admin_override') {
      await db.VerdictVote.updateMany(
        {
          objectType: input.target.objectType,
          objectId: input.target.id,
          channel: input.channel,
          channelStatus: { $ne: input.status },
          conflictDeclared: { $ne: true },
        },
        { $set: { outcomeStatus: 'overturned', outcomeDate: now } },
      );
    }
  }

  await recordEntryRevision({
    req: input.req,
    objectType: input.target.objectType,
    entry,
    source: 'update',
    summary: input.decisionMode === 'admin_override'
      ? `${input.channel === 'factual' ? 'Factual' : 'Ethical'} verdict set by administrator final say`
      : `${input.channel === 'factual' ? 'Factual' : 'Ethical'} verdict published by consensus`,
  });
  await logEntryEvent({
    scope: 'privileged',
    eventType: input.decisionMode === 'admin_override'
      ? `moderation.verdict.${input.channel}.admin_override`
      : `moderation.verdict.${input.channel}.consensus_published`,
    objectType: input.target.objectType,
    objectName: input.target.objectName,
    objectId: input.target.id,
    actorUserId: String(actorUserId || ''),
    actorUsername: String(input.req.user?.username || ''),
    message: input.decisionMode === 'admin_override'
      ? String(input.overrideReason || '')
      : `${input.channel} consensus published as ${input.status}`,
    payload: {
      channel: input.channel,
      status: input.status,
      reasoning: input.reasoning,
      framework: input.framework || '',
      evidenceRefs: input.evidenceRefs || [],
      decisionMode: input.decisionMode,
      policyVersion: input.policyVersion,
      overrideReason: input.overrideReason || '',
      consensusSnapshot: input.consensusSnapshot,
      blockingIssues,
    },
  });
  const plainEntry = entry.toObject ? entry.toObject() : entry;
  await notifySubscribers({
    target: input.target,
    type: 'verdict',
    trigger: 'verdict',
    title: input.decisionMode === 'admin_override' ? 'Administrator final decision recorded' : 'Consensus verdict published',
    body: `${input.target.objectName} ${input.channel} verdict is now ${input.status.replace(/_/g, ' ')}.`,
    link: entryLink(input.target.objectName, plainEntry, input.target.id),
    excludeUserIds: [String(actorUserId || '')],
    payload: { channel: input.channel, status: input.status, decisionMode: input.decisionMode },
  });

  return { published: true, entry: toModerationEntry(plainEntry, input.target) };
}
