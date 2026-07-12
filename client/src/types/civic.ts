export type CivicRecordKind =
  | 'institution'
  | 'office'
  | 'person'
  | 'project'
  | 'observation'
  | 'incident'
  | 'action'
  | 'election'
  | 'candidate'
  | 'history';

export type CivicRecordStatus = 'draft' | 'pending' | 'active' | 'verified' | 'resolved' | 'archived';
export type CivicRecordStage = 'reported' | 'screening' | 'investigating' | 'action_planned' | 'in_progress' | 'resolved' | 'closed';
export type CivicSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface CivicRecord {
  _id: string;
  kind: CivicRecordKind;
  title: string;
  friendlyUrl: string;
  summary?: string;
  description?: string;
  status: CivicRecordStatus;
  stage: CivicRecordStage;
  severity: CivicSeverity;
  parentId?: string | null;
  relatedRecordIds?: string[];
  artifactIds?: string[];
  issueIds?: string[];
  location?: {
    countryCode?: string;
    region?: string;
    province?: string;
    city?: string;
    barangay?: string;
    address?: string;
    coordinates?: { latitude?: number | null; longitude?: number | null };
  };
  responsibility?: {
    institutionId?: string | null;
    officeId?: string | null;
    personId?: string | null;
    role?: string;
    startDate?: string | null;
    endDate?: string | null;
  };
  project?: {
    budget?: number | null;
    currency?: string;
    contractor?: string;
    contractReference?: string;
    progressPercent?: number | null;
    startDate?: string | null;
    targetEndDate?: string | null;
    actualEndDate?: string | null;
  };
  observation?: {
    observedAt?: string | null;
    sourceUrl?: string;
    escalationStatus?: string;
  };
  election?: {
    position?: string;
    electionDate?: string | null;
    jurisdiction?: string;
    platform?: string;
  };
  outcome?: { summary?: string; happenedAt?: string | null };
  history?: Array<{
    _id?: string;
    action: string;
    summary: string;
    reason?: string;
    date: string;
    actorUsername?: string;
    fromStatus?: CivicRecordStatus;
    toStatus?: CivicRecordStatus;
    fromStage?: CivicRecordStage;
    toStage?: CivicRecordStage;
  }>;
  private?: boolean;
  createUserId?: string;
  createDate?: string;
  editDate?: string;
}

export interface CivicRecordInput {
  kind: CivicRecordKind;
  title: string;
  summary?: string;
  description?: string;
  severity?: CivicSeverity;
  parentId?: string;
  location?: CivicRecord['location'];
  project?: CivicRecord['project'];
  observation?: CivicRecord['observation'];
  election?: CivicRecord['election'];
  outcome?: CivicRecord['outcome'];
  private?: boolean;
}

export interface CivicOverview {
  counts: Record<CivicRecordKind, number>;
  recent: CivicRecord[];
  urgent: CivicRecord[];
  kinds: CivicRecordKind[];
  statuses: CivicRecordStatus[];
  stages: CivicRecordStage[];
}
