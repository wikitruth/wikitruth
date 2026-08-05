export const STRUCTURED_DEBATE_STATUSES = ['open', 'paused', 'closed', 'cancelled'] as const;
export type StructuredDebateStatus = typeof STRUCTURED_DEBATE_STATUSES[number];

export const STRUCTURED_DEBATE_STANCES = ['supports', 'challenges'] as const;
export type StructuredDebateStance = typeof STRUCTURED_DEBATE_STANCES[number];

export const STRUCTURED_DEBATE_PHASE_KEYS = ['opening', 'response', 'rebuttal', 'closing'] as const;
export type StructuredDebatePhaseKey = typeof STRUCTURED_DEBATE_PHASE_KEYS[number];

export const STRUCTURED_DEBATE_PHASE_STATUSES = ['upcoming', 'active', 'completed', 'skipped'] as const;
export type StructuredDebatePhaseStatus = typeof STRUCTURED_DEBATE_PHASE_STATUSES[number];

export const STRUCTURED_DEBATE_CONTRIBUTION_TYPES = [
  'argument',
  'evidence',
  'response',
  'clarification',
  'closing',
] as const;
export type StructuredDebateContributionType = typeof STRUCTURED_DEBATE_CONTRIBUTION_TYPES[number];

export const STRUCTURED_DEBATE_CONSENT_VERSION = 'structured-debate-pilot-consent-v1';
export const STRUCTURED_DEBATE_FORMAT_VERSION = 'structured-debate-pilot-v1';

export interface StructuredDebatePhaseRecord {
  key: StructuredDebatePhaseKey;
  label: string;
  order: number;
  status: StructuredDebatePhaseStatus;
  startedAt?: Date | null;
  dueAt?: Date | null;
  completedAt?: Date | null;
}

export interface StructuredDebateTransitionRecord {
  eventType: 'pilot_created' | 'pilot_paused' | 'pilot_resumed' | 'phase_advanced' | 'pilot_closed' | 'pilot_cancelled';
  actorUserId?: unknown;
  actorLabel: string;
  fromStatus?: StructuredDebateStatus | '';
  toStatus?: StructuredDebateStatus | '';
  fromPhase?: StructuredDebatePhaseKey | '';
  toPhase?: StructuredDebatePhaseKey | '';
  publicReason?: string;
  createDate: Date;
}

export interface StructuredDebatePilotRecord {
  _id?: unknown;
  activeEntryKey?: string | null;
  entryObjectType: number;
  entryObjectName: string;
  entryId: unknown;
  entryTitle: string;
  entryFriendlyUrl: string;
  proposition: string;
  status: StructuredDebateStatus;
  formatVersion: string;
  consentVersion: string;
  participantLimit: number;
  phaseWindowHours: number;
  contributionLimitPerParticipantPerPhase: number;
  evidenceRequired: boolean;
  currentPhaseKey: StructuredDebatePhaseKey;
  phases: StructuredDebatePhaseRecord[];
  facilitatorUserIds: unknown[];
  createUserId: unknown;
  createUsername: string;
  createDate: Date;
  editDate: Date;
  closedAt?: Date | null;
  transitions: StructuredDebateTransitionRecord[];
}

export interface StructuredDebateParticipantRecord {
  _id?: unknown;
  pilotId: unknown;
  userId: unknown;
  publicUsername: string;
  stance: StructuredDebateStance;
  status: 'active' | 'withdrawn';
  consentVersion: string;
  publicAttributionAccepted: boolean;
  consentedAt: Date;
  withdrewAt?: Date | null;
  createDate: Date;
  editDate: Date;
}

export interface StructuredDebateEvidenceLink {
  url: string;
  label: string;
}

export interface StructuredDebateContributionRecord {
  _id?: unknown;
  pilotId: unknown;
  participantId: unknown;
  userId: unknown;
  publicUsername: string;
  stance: StructuredDebateStance;
  phaseKey: StructuredDebatePhaseKey;
  contributionType: StructuredDebateContributionType;
  content: string;
  evidenceLinks: StructuredDebateEvidenceLink[];
  revisionNumber: number;
  createDate: Date;
  editDate: Date;
}
