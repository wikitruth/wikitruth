export type ModerationTargetKey =
  | 'topic'
  | 'topicLink'
  | 'argument'
  | 'argumentLink'
  | 'artifact'
  | 'question'
  | 'answer'
  | 'issue'
  | 'opinion';

export interface ModerationTarget {
  key: ModerationTargetKey;
  id: string;
}

export interface ModerationStatusOption {
  code: number;
  text: string;
}

export type VerdictChannel = 'factual' | 'ethical';

export interface VerdictChannelValue {
  status: string;
  reasoning?: string;
  framework?: string;
  evidenceRefs?: string[];
  decisionMode?: 'none' | 'consensus' | 'admin_override';
  policyVersion?: string;
  sensitivity?: 'standard' | 'elevated' | 'critical';
  revalidateAt?: string | null;
  overrideReason?: string;
  consensusSnapshot?: VerdictConsensusSummary | null;
  editDate?: string | null;
  editUserId?: string | null;
}

export interface VerdictConsensusSummary {
  channel: VerdictChannel;
  policyVersion: string;
  totalVotes: number;
  eligibleVotes: number;
  excludedConflictVotes: number;
  excludedIneligibleVotes: number;
  excludedIndependenceVotes: number;
  abstentions: number;
  threshold: number;
  sensitivity: 'standard' | 'elevated' | 'critical';
  minimumDistinctAffiliations: number;
  distinctAffiliations: number;
  leadingStatus: string | null;
  leadingCount: number;
  leadingRatio: number;
  leadingAverageConfidence: number;
  reached: boolean;
  counts: Array<{ status: string; count: number }>;
  dissent: {
    totalVotes: number;
    statuses: Array<{ status: string; count: number }>;
    rationales: string[];
    evidenceRefs: string[];
  };
  revalidationIntervalDays: number;
}

export interface VerdictAdvice {
  _id: string;
  objectType: number;
  objectName: string;
  objectId: string;
  baseRevisionId: string;
  channel: VerdictChannel;
  channelStatus: string;
  rationale: string;
  framework?: string;
  evidenceRefs: string[];
  confidence: number;
  status: 'pending' | 'reviewing' | 'countersigned' | 'rejected' | 'stale';
  apiClientName: string;
  agentModel?: string;
  agentProvider?: string;
  agentPurpose?: string;
  createDate?: string;
}

export interface ModerationEntry {
  _id?: string;
  title?: string;
  friendlyUrl?: string;
  objectType?: number;
  objectName?: string;
  editDate?: string;
  createDate?: string;
  screening?: { status?: number | null };
  verdict?: { status?: number | null; reasoning?: string | null };
  verdictReasoning?: string | null;
  verdictChannels?: {
    factual: VerdictChannelValue;
    ethical: VerdictChannelValue;
  };
  ownerId?: string | null;
  ownerType?: number | null;
  parentId?: string | null;
  questionId?: string | null;
  voteSummary?: {
    totalVotes: number;
    threshold: number;
    consensusReached: boolean;
    consensusStatus: number | null;
    counts: Array<{ status: string; count: number }>;
    channels?: { factual: VerdictConsensusSummary; ethical: VerdictConsensusSummary };
  };
}

export interface VerdictDecisionHistory {
  _id?: string;
  eventType: string;
  actorUsername?: string;
  message?: string;
  payload?: {
    channel?: VerdictChannel;
    status?: string;
    decisionMode?: 'consensus' | 'admin_override';
    overrideReason?: string;
    policyVersion?: string;
  };
  createDate?: string;
  chainSequence?: number;
  eventHash?: string;
}

export interface ModerationEntryResponse {
  success: boolean;
  target: { objectType: number; objectName: string; id: string };
  entry: ModerationEntry;
  screeningStatuses: ModerationStatusOption[];
  verdictStatuses: ModerationStatusOption[];
  verdictChannelStatuses: { factual: string[]; ethical: string[] };
  decisionHistory: VerdictDecisionHistory[];
}
