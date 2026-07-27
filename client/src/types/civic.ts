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
export type CivicEntryRelationship = 'subject' | 'claim' | 'question' | 'answer' | 'evidence' | 'discussion' | 'review_issue';
export type CivicTenantRole = 'reader' | 'contributor' | 'screener' | 'reviewer' | 'admin';
export type CivicExtensionFieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'url' | 'select';
export type CivicExtensionValue = string | number | boolean;

export interface CivicExtensionField {
  key: string;
  label: string;
  type: CivicExtensionFieldType;
  description?: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
}

export interface CivicExtensionSchema {
  title?: string;
  description?: string;
  fields: CivicExtensionField[];
}

export interface CivicTenantSection {
  slug: string;
  title: string;
  description: string;
  icon: string;
  kinds: CivicRecordKind[];
  createKinds: CivicRecordKind[];
  enabled: boolean;
}

export interface CivicTenant {
  tenantId: string;
  status: 'active' | 'inactive';
  countryCode: string;
  title: string;
  navTitle: string;
  slogan: string;
  site?: {
    homeTitle: string;
    homeDescription: string;
    aboutUrl: string;
    exploreUrl: string;
    knowledgeRootTopicId: string;
  };
  domains: string[];
  branding: {
    logoIcon: string;
    favicon: string;
    primaryColor: string;
    accentColor: string;
    surfaceColor: string;
    fontFamily: string;
  };
  localization: {
    defaultLocale: string;
    supportedLocales: string[];
    timezone: string;
    currency: string;
  };
  geography: {
    levels: Array<{ key: string; label: string }>;
    addressFields: string[];
  };
  sections: CivicTenantSection[];
  featureFlags: Record<string, boolean>;
  extensionSchemas: Record<string, CivicExtensionSchema>;
  moderationPolicyVersion: string;
  electionSystem: string;
  deploymentMode: 'shared' | 'dedicated' | 'headless';
}

export interface CivicTenantReadinessCheck {
  key: string;
  label: string;
  status: 'pass' | 'warning' | 'fail';
  message: string;
}

export interface CivicTenantReadiness {
  tenantId: string;
  scope: 'configuration' | 'launch';
  ready: boolean;
  generatedAt: string;
  checks: CivicTenantReadinessCheck[];
  summary: { passed: number; warnings: number; failed: number };
}

export interface CivicTenantPreview {
  tenant: CivicTenant;
  readiness: CivicTenantReadiness;
  presentation: {
    cssVariables: Record<string, string>;
    navigation: Array<{ slug: string; title: string; icon: string; href: string }>;
    home: { title: string; description: string; slogan: string };
  };
}

export interface PortableCivicTenantConfiguration {
  format: 'wikitruth.civic-tenant';
  version: '1.0';
  exportedAt: string;
  tenant: CivicTenant;
  readiness: CivicTenantReadiness;
}

export interface CivicJurisdiction {
  _id: string;
  tenantId: string;
  code: string;
  countryCode: string;
  levelKey: string;
  name: string;
  friendlyUrl: string;
  parentId?: string | null;
  metadata?: Record<string, unknown>;
  active?: boolean;
}

export interface CivicActorContext {
  authenticated: boolean;
  tenantId: string;
  userId: string | null;
  roles: CivicTenantRole[];
}

export interface CivicMembershipUser {
  _id: string;
  username: string;
  email?: string;
}

export interface CivicTenantMembership {
  _id: string;
  tenantId: string;
  userId: string;
  roles: CivicTenantRole[];
  active: boolean;
  user?: CivicMembershipUser | null;
  createDate?: string;
  editDate?: string;
}

export interface CivicEntryLink {
  linkId?: string;
  relationship: CivicEntryRelationship;
  objectType: number;
  objectName: 'topic' | 'argument' | 'question' | 'answer' | 'artifact' | 'opinion' | 'issue';
  objectId: string;
  title: string;
  friendlyUrl: string;
  contentPreview?: string;
  url: string;
  legacy: boolean;
}

export interface CivicRecord {
  _id: string;
  tenantId: string;
  countryCode: string;
  jurisdictionId?: string | null;
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
  extensions?: Record<string, CivicExtensionValue>;
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
  jurisdictionId?: string;
  parentId?: string;
  location?: CivicRecord['location'];
  project?: CivicRecord['project'];
  observation?: CivicRecord['observation'];
  election?: CivicRecord['election'];
  outcome?: CivicRecord['outcome'];
  extensions?: CivicRecord['extensions'];
  private?: boolean;
}

export interface CivicResponseRequest {
  _id: string;
  civicRecordId: string;
  requestType: 'subject_response' | 'correction_request';
  claimedRelationship?: string;
  title: string;
  content: string;
  evidenceUrls?: string[];
  status: 'pending' | 'published' | 'rejected' | 'resolved';
  createUsername?: string;
  reviewUsername?: string;
  reviewReason?: string;
  createDate?: string;
  history?: Array<{ _id?: string; action: string; reason?: string; actorUsername?: string; date: string }>;
}

export interface CivicOverview {
  counts: Record<CivicRecordKind, number>;
  recent: CivicRecord[];
  urgent: CivicRecord[];
  kinds: CivicRecordKind[];
  statuses: CivicRecordStatus[];
  stages: CivicRecordStage[];
}
