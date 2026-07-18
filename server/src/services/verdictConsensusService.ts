export type VerdictChannel = 'factual' | 'ethical';

export const FACTUAL_VOTE_STATUSES = [
  'supported',
  'refuted',
  'mixed',
  'insufficient_evidence',
  'abstain',
] as const;

export const ETHICAL_VOTE_STATUSES = [
  'permissible',
  'impermissible',
  'contested',
  'not_applicable',
  'abstain',
] as const;

export type VerdictVoteStatus =
  | (typeof FACTUAL_VOTE_STATUSES)[number]
  | (typeof ETHICAL_VOTE_STATUSES)[number];

export interface VerdictConsensusPolicy {
  version: string;
  minimumEligibleVotes: number;
  minimumLeadingVotes: number;
  supermajorityRatio: number;
  minimumAverageConfidence: number;
}

export interface ChannelVoteInput {
  channel?: unknown;
  channelStatus?: unknown;
  confidence?: unknown;
  conflictDeclared?: unknown;
  voterUserId?: unknown;
  rationale?: unknown;
  framework?: unknown;
  evidenceRefs?: unknown;
}

export interface VerdictConsensusSummary {
  channel: VerdictChannel;
  policyVersion: string;
  totalVotes: number;
  eligibleVotes: number;
  excludedConflictVotes: number;
  abstentions: number;
  threshold: number;
  leadingStatus: string | null;
  leadingCount: number;
  leadingRatio: number;
  leadingAverageConfidence: number;
  reached: boolean;
  counts: Array<{ status: string; count: number }>;
}

export const DEFAULT_VERDICT_CONSENSUS_POLICY: VerdictConsensusPolicy = {
  version: '2026-07-v2',
  minimumEligibleVotes: 3,
  minimumLeadingVotes: 2,
  supermajorityRatio: 2 / 3,
  minimumAverageConfidence: 60,
};

export function voteStatusesForChannel(channel: VerdictChannel): readonly string[] {
  return channel === 'factual' ? FACTUAL_VOTE_STATUSES : ETHICAL_VOTE_STATUSES;
}

export function isVerdictChannel(value: unknown): value is VerdictChannel {
  return value === 'factual' || value === 'ethical';
}

export function isVoteStatusForChannel(channel: VerdictChannel, value: unknown): value is VerdictVoteStatus {
  return voteStatusesForChannel(channel).includes(String(value || '').trim().toLowerCase());
}

function boundedConfidence(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
}

export function computeChannelConsensus(
  channel: VerdictChannel,
  votes: ChannelVoteInput[],
  policy: VerdictConsensusPolicy = DEFAULT_VERDICT_CONSENSUS_POLICY,
): VerdictConsensusSummary {
  const channelVotes = votes.filter((vote) => vote.channel === channel);
  const nonConflicted = channelVotes.filter((vote) => vote.conflictDeclared !== true);
  const eligible = nonConflicted.filter((vote) => String(vote.channelStatus || '') !== 'abstain');
  const abstentions = nonConflicted.length - eligible.length;
  const countsMap = new Map<string, number>();
  const confidenceMap = new Map<string, number[]>();

  eligible.forEach((vote) => {
    const status = String(vote.channelStatus || '');
    if (!isVoteStatusForChannel(channel, status) || status === 'abstain') return;
    countsMap.set(status, Number(countsMap.get(status) || 0) + 1);
    confidenceMap.set(status, [...(confidenceMap.get(status) || []), boundedConfidence(vote.confidence)]);
  });

  const counts = Array.from(countsMap.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((left, right) => right.count - left.count || left.status.localeCompare(right.status));
  const leadingStatus = counts[0]?.status || null;
  const leadingCount = counts[0]?.count || 0;
  const leadingConfidence = leadingStatus ? confidenceMap.get(leadingStatus) || [] : [];
  const leadingAverageConfidence = leadingConfidence.length
    ? leadingConfidence.reduce((sum, value) => sum + value, 0) / leadingConfidence.length
    : 0;
  const threshold = Math.max(
    policy.minimumLeadingVotes,
    Math.ceil(eligible.length * policy.supermajorityRatio),
  );
  const leadingRatio = eligible.length ? leadingCount / eligible.length : 0;
  const reached = eligible.length >= policy.minimumEligibleVotes
    && leadingCount >= threshold
    && leadingAverageConfidence >= policy.minimumAverageConfidence;

  return {
    channel,
    policyVersion: policy.version,
    totalVotes: channelVotes.length,
    eligibleVotes: eligible.length,
    excludedConflictVotes: channelVotes.length - nonConflicted.length,
    abstentions,
    threshold,
    leadingStatus,
    leadingCount,
    leadingRatio,
    leadingAverageConfidence,
    reached,
    counts,
  };
}

export function consensusDecisionDetails(
  summary: VerdictConsensusSummary,
  votes: ChannelVoteInput[],
): { reasoning: string; evidenceRefs: string[]; framework: string } {
  const leadingVotes = votes.filter((vote) => (
    vote.channel === summary.channel
      && vote.channelStatus === summary.leadingStatus
      && vote.conflictDeclared !== true
  ));
  const rationales = leadingVotes
    .map((vote) => String(vote.rationale || '').trim())
    .filter(Boolean)
    .slice(0, 3);
  const evidenceRefs = Array.from(new Set(
    leadingVotes.flatMap((vote) => Array.isArray(vote.evidenceRefs) ? vote.evidenceRefs.map(String) : []),
  ));
  const frameworks = new Map<string, number>();
  leadingVotes.forEach((vote) => {
    const framework = String(vote.framework || '').trim();
    if (framework) frameworks.set(framework, Number(frameworks.get(framework) || 0) + 1);
  });
  const framework = Array.from(frameworks.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] || '';
  const prefix = `Consensus reached with ${summary.leadingCount} of ${summary.eligibleVotes} eligible votes`;
  return {
    reasoning: rationales.length ? `${prefix}. ${rationales.join(' ')}` : `${prefix}.`,
    evidenceRefs,
    framework,
  };
}

