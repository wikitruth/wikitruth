import { createApiClient } from './client';

const request = createApiClient();

export type StructuredDebateStatus = 'open' | 'paused' | 'closed' | 'cancelled';
export type StructuredDebateStance = 'supports' | 'challenges';
export type StructuredDebatePhaseKey = 'opening' | 'response' | 'rebuttal' | 'closing';
export type StructuredDebateContributionType = 'argument' | 'evidence' | 'response' | 'clarification' | 'closing';
export type StructuredDebateTransitionAction = 'pause' | 'resume' | 'advance' | 'close' | 'cancel';

export const STRUCTURED_DEBATE_CONSENT_VERSION = 'structured-debate-pilot-consent-v1';

export interface StructuredDebatePhase {
  key: StructuredDebatePhaseKey;
  label: string;
  order: number;
  status: 'upcoming' | 'active' | 'completed' | 'skipped';
  startedAt: string | null;
  dueAt: string | null;
  completedAt: string | null;
}

export interface StructuredDebateParticipant {
  key: string;
  publicUsername: string;
  stance: StructuredDebateStance;
  status: 'active' | 'withdrawn';
  consentedAt: string;
  withdrewAt: string | null;
}

export interface StructuredDebateContribution {
  id: string;
  participantKey: string;
  publicUsername: string;
  stance: StructuredDebateStance;
  phaseKey: StructuredDebatePhaseKey;
  contributionType: StructuredDebateContributionType;
  content: string;
  authorshipType?: 'human' | 'agent';
  agentAttribution?: {
    clientName: string;
    runId: string;
    model: string;
    provider: string;
    purpose: string;
    sources: Array<{ url: string; artifactId: string; checksum: string }>;
  } | null;
  evidenceLinks: Array<{ url: string; label: string }>;
  revisionNumber: number;
  createDate: string;
  editDate: string;
}

export interface StructuredDebateAuditEvent {
  kind: 'transition' | 'participation' | 'contribution';
  eventType: string;
  label: string;
  actor: string;
  occurredAt: string;
  stance?: StructuredDebateStance;
  fromStatus?: StructuredDebateStatus | null;
  toStatus?: StructuredDebateStatus | null;
  fromPhase?: StructuredDebatePhaseKey | null;
  toPhase?: StructuredDebatePhaseKey | null;
  phaseKey?: StructuredDebatePhaseKey;
  publicReason?: string;
  contributionId?: string;
  authorshipType?: 'human' | 'agent';
  agentAttribution?: StructuredDebateContribution['agentAttribution'];
}

export interface StructuredDebate {
  id: string;
  status: StructuredDebateStatus;
  proposition: string;
  entry: {
    objectName: string;
    id: string;
    title: string;
    path: string;
    discussionPath: string;
  };
  format: {
    version: string;
    consentVersion: string;
    participantLimit: number;
    phaseWindowHours: number;
    contributionLimitPerParticipantPerPhase: number;
    evidenceRequired: boolean;
    alternatingStances: true;
    verdictImpact: 'none';
  };
  phases: StructuredDebatePhase[];
  currentPhaseKey: StructuredDebatePhaseKey;
  currentTurnStance: StructuredDebateStance;
  participants: StructuredDebateParticipant[];
  contributions: StructuredDebateContribution[];
  audit: StructuredDebateAuditEvent[];
  reviewerSummary: null;
  verdictStatus: null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  viewer: {
    authenticated: boolean;
    canCreatePilot: boolean;
    canFacilitate: boolean;
    canJoin: boolean;
    participant: Pick<StructuredDebateParticipant, 'key' | 'publicUsername' | 'stance' | 'status'> | null;
    canContribute: boolean;
    contributionBlockReason: string | null;
  };
}

interface DebateEnvelope {
  success: boolean;
  debate?: StructuredDebate | null;
  message?: string;
  error?: { code?: string; message?: string };
}

function unwrapDebate(body: DebateEnvelope): StructuredDebate {
  if (!body.success || !body.debate) {
    throw new Error(body.error?.message || body.message || 'Unable to load the structured debate');
  }
  return body.debate;
}

function body(value: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(value) };
}

export async function getStructuredDebate(id: string): Promise<StructuredDebate> {
  return unwrapDebate(await request<DebateEnvelope>(`/structured-debates/${encodeURIComponent(id)}`));
}

export async function getStructuredDebateForEntry(objectName: string, entryId: string): Promise<StructuredDebate | null> {
  const response = await request<DebateEnvelope>(
    `/structured-debates/entry/${encodeURIComponent(objectName)}/${encodeURIComponent(entryId)}`,
  );
  if (!response.success) throw new Error(response.error?.message || response.message || 'Unable to check the debate pilot');
  return response.debate || null;
}

export async function createStructuredDebate(input: {
  entryObjectName: string;
  entryId: string;
  proposition: string;
  participantLimit: number;
  phaseWindowHours: number;
}): Promise<StructuredDebate> {
  return unwrapDebate(await request<DebateEnvelope>('/structured-debates', body(input)));
}

export async function joinStructuredDebate(id: string, stance: StructuredDebateStance): Promise<StructuredDebate> {
  return unwrapDebate(await request<DebateEnvelope>(`/structured-debates/${encodeURIComponent(id)}/join`, body({
    stance,
    consentAccepted: true,
    publicAttributionAccepted: true,
    consentVersion: STRUCTURED_DEBATE_CONSENT_VERSION,
  })));
}

export async function withdrawStructuredDebate(id: string): Promise<StructuredDebate> {
  return unwrapDebate(await request<DebateEnvelope>(`/structured-debates/${encodeURIComponent(id)}/withdraw`, body({})));
}

export async function submitStructuredDebateContribution(id: string, input: {
  contributionType: StructuredDebateContributionType;
  content: string;
  evidenceLinks: Array<{ url: string; label: string }>;
}): Promise<StructuredDebate> {
  return unwrapDebate(await request<DebateEnvelope>(
    `/structured-debates/${encodeURIComponent(id)}/contributions`,
    body(input),
  ));
}

export async function transitionStructuredDebate(
  id: string,
  action: StructuredDebateTransitionAction,
  publicReason: string,
): Promise<StructuredDebate> {
  return unwrapDebate(await request<DebateEnvelope>(
    `/structured-debates/${encodeURIComponent(id)}/transitions`,
    body({ action, publicReason }),
  ));
}
