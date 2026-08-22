'use strict';

import type { WikitruthRequest } from '../../types/http';
import { logEntryEvent } from '../../services/entryEventsService';
import {
  db,
  getDbModelByObjectType,
  mapLegacyVerdictToFactual,
  toNumber,
} from './moderationShared';
import {
  computeChannelConsensus,
  consensusDecisionDetails,
  isVerdictChannel,
  isVoteStatusForChannel,
  verdictPolicyForSensitivity,
  type VerdictChannel,
  type VerdictConsensusPolicy,
} from '../../services/verdictConsensusService';
import { writeVerdictDecision } from './verdictDecisionWriter';
import { queueKnowledgeReviewTask } from '../../services/knowledgeReviewTaskService';

function validObjectIds(value: unknown): string[] {
  return Array.isArray(value)
    ? Array.from(new Set(value.map((id) => String(id || '').trim()).filter((id) => /^[a-f\d]{24}$/i.test(id))))
    : [];
}

export function parseVoteBody(
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

export function parseVote(req: WikitruthRequest, policy: VerdictConsensusPolicy) {
  return parseVoteBody((req.body || {}) as Record<string, unknown>, policy);
}

export function normalizedRevisionId(value: unknown): string {
  return String(value || '').trim().replace(/^W\//, '').replace(/^"|"$/g, '');
}

export async function policyForTarget(target: { objectType: number; id: string }): Promise<VerdictConsensusPolicy> {
  const model = getDbModelByObjectType(target.objectType);
  if (!model?.findById) return verdictPolicyForSensitivity('standard');
  const entry = await model.findById(target.id).select('extras.verdictSensitivity').lean();
  return verdictPolicyForSensitivity(entry?.extras?.verdictSensitivity);
}

export async function persistHumanVote(
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
