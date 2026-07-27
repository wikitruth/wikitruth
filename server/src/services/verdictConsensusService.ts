export type VerdictChannel = 'factual' | 'ethical';
export type VerdictSensitivity = 'standard' | 'elevated' | 'critical';

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
  sensitivity: VerdictSensitivity;
  minimumEligibleVotes: number;
  minimumLeadingVotes: number;
  minimumDistinctAffiliations: number;
  maximumVotesPerAffiliation: number;
  supermajorityRatio: number;
  minimumAverageConfidence: number;
  requireExpertise: boolean;
  requireAffiliation: boolean;
  revalidationIntervalDays: number;
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
  expertise?: unknown;
  affiliation?: unknown;
  eligibilityStatus?: unknown;
  eligibilityReason?: unknown;
}

export interface VerdictDissentSummary {
  totalVotes: number;
  statuses: Array<{ status: string; count: number }>;
  rationales: string[];
  evidenceRefs: string[];
}

export interface VerdictConsensusSummary {
  channel: VerdictChannel;
  policyVersion: string;
  sensitivity: VerdictSensitivity;
  totalVotes: number;
  eligibleVotes: number;
  excludedConflictVotes: number;
  excludedIneligibleVotes: number;
  excludedIndependenceVotes: number;
  abstentions: number;
  threshold: number;
  minimumDistinctAffiliations: number;
  distinctAffiliations: number;
  leadingStatus: string | null;
  leadingCount: number;
  leadingRatio: number;
  leadingAverageConfidence: number;
  reached: boolean;
  counts: Array<{ status: string; count: number }>;
  dissent: VerdictDissentSummary;
  revalidationIntervalDays: number;
}

export const VERDICT_CONSENSUS_POLICIES: Record<VerdictSensitivity, VerdictConsensusPolicy> = {
  standard: {
    version: '2026-07-v3-standard',
    sensitivity: 'standard',
    minimumEligibleVotes: 3,
    minimumLeadingVotes: 2,
    minimumDistinctAffiliations: 2,
    maximumVotesPerAffiliation: 1,
    supermajorityRatio: 2 / 3,
    minimumAverageConfidence: 60,
    requireExpertise: false,
    requireAffiliation: false,
    revalidationIntervalDays: 365,
  },
  elevated: {
    version: '2026-07-v3-elevated',
    sensitivity: 'elevated',
    minimumEligibleVotes: 4,
    minimumLeadingVotes: 3,
    minimumDistinctAffiliations: 2,
    maximumVotesPerAffiliation: 1,
    supermajorityRatio: 0.75,
    minimumAverageConfidence: 65,
    requireExpertise: true,
    requireAffiliation: true,
    revalidationIntervalDays: 180,
  },
  critical: {
    version: '2026-07-v3-critical',
    sensitivity: 'critical',
    minimumEligibleVotes: 5,
    minimumLeadingVotes: 4,
    minimumDistinctAffiliations: 3,
    maximumVotesPerAffiliation: 1,
    supermajorityRatio: 0.8,
    minimumAverageConfidence: 70,
    requireExpertise: true,
    requireAffiliation: true,
    revalidationIntervalDays: 90,
  },
};

export const DEFAULT_VERDICT_CONSENSUS_POLICY = VERDICT_CONSENSUS_POLICIES.standard;

export function normalizeVerdictSensitivity(value: unknown): VerdictSensitivity {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'elevated' || normalized === 'critical' ? normalized : 'standard';
}

export function verdictPolicyForSensitivity(value: unknown): VerdictConsensusPolicy {
  return VERDICT_CONSENSUS_POLICIES[normalizeVerdictSensitivity(value)];
}

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

function affiliationKey(vote: ChannelVoteInput, index: number): string {
  const affiliation = String(vote.affiliation || '').trim().toLowerCase();
  if (affiliation) return `affiliation:${affiliation}`;
  const voterUserId = String(vote.voterUserId || '').trim();
  return voterUserId ? `individual:${voterUserId}` : `anonymous:${index}`;
}

function isPolicyEligible(vote: ChannelVoteInput, policy: VerdictConsensusPolicy): boolean {
  if (vote.conflictDeclared === true || vote.eligibilityStatus === 'ineligible') return false;
  if (policy.requireExpertise && String(vote.expertise || '').trim().length < 3) return false;
  if (policy.requireAffiliation && String(vote.affiliation || '').trim().length < 2) return false;
  return true;
}

function selectEligibleVotes(
  channel: VerdictChannel,
  votes: ChannelVoteInput[],
  policy: VerdictConsensusPolicy,
): { eligible: ChannelVoteInput[]; affiliationKeys: string[]; excludedIndependenceVotes: number } {
  const candidates = votes
    .map((vote, index) => ({ vote, index }))
    .filter(({ vote }) => vote.channel === channel)
    .filter(({ vote }) => isPolicyEligible(vote, policy))
    .filter(({ vote }) => String(vote.channelStatus || '') !== 'abstain')
    .filter(({ vote }) => isVoteStatusForChannel(channel, vote.channelStatus));
  const byAffiliation = new Map<string, Array<{ vote: ChannelVoteInput; index: number }>>();
  candidates.forEach((candidate) => {
    const key = affiliationKey(candidate.vote, candidate.index);
    byAffiliation.set(key, [...(byAffiliation.get(key) || []), candidate]);
  });

  let excludedIndependenceVotes = 0;
  const selected: Array<{ vote: ChannelVoteInput; key: string }> = [];
  byAffiliation.forEach((affiliationVotes, key) => {
    const ordered = affiliationVotes.sort((left, right) => (
      boundedConfidence(right.vote.confidence) - boundedConfidence(left.vote.confidence)
    ));
    selected.push(...ordered.slice(0, policy.maximumVotesPerAffiliation).map(({ vote }) => ({ vote, key })));
    excludedIndependenceVotes += Math.max(0, ordered.length - policy.maximumVotesPerAffiliation);
  });

  return {
    eligible: selected.map(({ vote }) => vote),
    affiliationKeys: selected.map(({ key }) => key),
    excludedIndependenceVotes,
  };
}

function summarizeDissent(
  eligible: ChannelVoteInput[],
  leadingStatus: string | null,
): VerdictDissentSummary {
  const dissentVotes = leadingStatus
    ? eligible.filter((vote) => String(vote.channelStatus || '') !== leadingStatus)
    : [];
  const statusCounts = new Map<string, number>();
  dissentVotes.forEach((vote) => {
    const status = String(vote.channelStatus || '');
    statusCounts.set(status, Number(statusCounts.get(status) || 0) + 1);
  });
  return {
    totalVotes: dissentVotes.length,
    statuses: Array.from(statusCounts.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((left, right) => right.count - left.count || left.status.localeCompare(right.status)),
    rationales: dissentVotes.map((vote) => String(vote.rationale || '').trim()).filter(Boolean).slice(0, 5),
    evidenceRefs: Array.from(new Set(dissentVotes.flatMap((vote) => (
      Array.isArray(vote.evidenceRefs) ? vote.evidenceRefs.map(String) : []
    )))),
  };
}

export function computeChannelConsensus(
  channel: VerdictChannel,
  votes: ChannelVoteInput[],
  policy: VerdictConsensusPolicy = DEFAULT_VERDICT_CONSENSUS_POLICY,
): VerdictConsensusSummary {
  const channelVotes = votes.filter((vote) => vote.channel === channel);
  const nonConflicted = channelVotes.filter((vote) => vote.conflictDeclared !== true);
  const abstentions = nonConflicted.filter((vote) => String(vote.channelStatus || '') === 'abstain').length;
  const excludedIneligibleVotes = nonConflicted.filter((vote) => (
    String(vote.channelStatus || '') !== 'abstain' && !isPolicyEligible(vote, policy)
  )).length;
  const selection = selectEligibleVotes(channel, votes, policy);
  const eligible = selection.eligible;
  const countsMap = new Map<string, number>();
  const confidenceMap = new Map<string, number[]>();

  eligible.forEach((vote) => {
    const status = String(vote.channelStatus || '');
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
  const threshold = Math.max(policy.minimumLeadingVotes, Math.ceil(eligible.length * policy.supermajorityRatio));
  const leadingRatio = eligible.length ? leadingCount / eligible.length : 0;
  const distinctAffiliations = new Set(selection.affiliationKeys).size;
  const reached = eligible.length >= policy.minimumEligibleVotes
    && distinctAffiliations >= policy.minimumDistinctAffiliations
    && leadingCount >= threshold
    && leadingAverageConfidence >= policy.minimumAverageConfidence;

  return {
    channel,
    policyVersion: policy.version,
    sensitivity: policy.sensitivity,
    totalVotes: channelVotes.length,
    eligibleVotes: eligible.length,
    excludedConflictVotes: channelVotes.length - nonConflicted.length,
    excludedIneligibleVotes,
    excludedIndependenceVotes: selection.excludedIndependenceVotes,
    abstentions,
    threshold,
    minimumDistinctAffiliations: policy.minimumDistinctAffiliations,
    distinctAffiliations,
    leadingStatus,
    leadingCount,
    leadingRatio,
    leadingAverageConfidence,
    reached,
    counts,
    dissent: summarizeDissent(eligible, leadingStatus),
    revalidationIntervalDays: policy.revalidationIntervalDays,
  };
}

export function consensusDecisionDetails(
  summary: VerdictConsensusSummary,
  votes: ChannelVoteInput[],
  policy: VerdictConsensusPolicy = verdictPolicyForSensitivity(summary.sensitivity),
): { reasoning: string; evidenceRefs: string[]; framework: string } {
  const leadingVotes = selectEligibleVotes(summary.channel, votes, policy).eligible.filter((vote) => (
    vote.channelStatus === summary.leadingStatus
  ));
  const rationales = leadingVotes.map((vote) => String(vote.rationale || '').trim()).filter(Boolean).slice(0, 3);
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
