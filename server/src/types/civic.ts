export const CIVIC_RECORD_KINDS = [
  'institution',
  'office',
  'person',
  'project',
  'observation',
  'incident',
  'action',
  'election',
  'candidate',
  'history',
] as const;

export type CivicRecordKind = (typeof CIVIC_RECORD_KINDS)[number];

export const CIVIC_RECORD_STATUSES = [
  'draft',
  'pending',
  'active',
  'verified',
  'resolved',
  'archived',
] as const;

export type CivicRecordStatus = (typeof CIVIC_RECORD_STATUSES)[number];

export const CIVIC_RECORD_STAGES = [
  'reported',
  'screening',
  'investigating',
  'action_planned',
  'in_progress',
  'resolved',
  'closed',
] as const;

export type CivicRecordStage = (typeof CIVIC_RECORD_STAGES)[number];

export const CIVIC_SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'] as const;
export type CivicSeverity = (typeof CIVIC_SEVERITIES)[number];

export interface CivicHistoryItem {
  action: string;
  summary: string;
  reason?: string;
  date: Date | string;
  actorUserId?: string;
  actorUsername?: string;
  fromStatus?: CivicRecordStatus;
  toStatus?: CivicRecordStatus;
  fromStage?: CivicRecordStage;
  toStage?: CivicRecordStage;
  relatedRecordIds?: string[];
}
