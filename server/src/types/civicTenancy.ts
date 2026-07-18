export const CIVIC_TENANT_STATUSES = ['active', 'inactive'] as const;
export type CivicTenantStatus = (typeof CIVIC_TENANT_STATUSES)[number];

export const CIVIC_DEPLOYMENT_MODES = ['shared', 'dedicated', 'headless'] as const;
export type CivicDeploymentMode = (typeof CIVIC_DEPLOYMENT_MODES)[number];

export const CIVIC_TENANT_ROLES = ['reader', 'contributor', 'screener', 'reviewer', 'admin'] as const;
export type CivicTenantRole = (typeof CIVIC_TENANT_ROLES)[number];

export const CIVIC_ENTRY_RELATIONSHIPS = [
  'subject',
  'claim',
  'question',
  'answer',
  'evidence',
  'discussion',
  'review_issue',
] as const;
export type CivicEntryRelationship = (typeof CIVIC_ENTRY_RELATIONSHIPS)[number];

export const CIVIC_LINKED_OBJECT_NAMES = [
  'topic',
  'argument',
  'question',
  'answer',
  'artifact',
  'opinion',
  'issue',
] as const;
export type CivicLinkedObjectName = (typeof CIVIC_LINKED_OBJECT_NAMES)[number];

export const CIVIC_EXTENSION_FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'boolean',
  'date',
  'url',
  'select',
] as const;
export type CivicExtensionFieldType = (typeof CIVIC_EXTENSION_FIELD_TYPES)[number];

export interface CivicExtensionOption {
  value: string;
  label: string;
}

export interface CivicExtensionField {
  key: string;
  label: string;
  type: CivicExtensionFieldType;
  description?: string;
  placeholder?: string;
  required?: boolean;
  options?: CivicExtensionOption[];
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

export type CivicExtensionSchemas = Record<string, CivicExtensionSchema>;
export type CivicExtensionValue = string | number | boolean;
export type CivicExtensionValues = Record<string, CivicExtensionValue>;

export interface CivicTenantSection {
  slug: string;
  title: string;
  description: string;
  icon: string;
  kinds: string[];
  createKinds: string[];
  enabled: boolean;
}

export interface CivicTenantSite {
  homeTitle: string;
  homeDescription: string;
  aboutUrl: string;
  exploreUrl: string;
  knowledgeRootTopicId: string;
}

export interface CivicTenantDefinition {
  tenantId: string;
  status: CivicTenantStatus;
  countryCode: string;
  title: string;
  navTitle: string;
  slogan: string;
  site: CivicTenantSite;
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
  extensionSchemas: CivicExtensionSchemas;
  moderationPolicyVersion: string;
  electionSystem: string;
  deploymentMode: CivicDeploymentMode;
}
