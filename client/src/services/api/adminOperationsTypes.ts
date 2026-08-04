export type AdminRecord = Record<string, unknown> & {
  _id?: string;
  id?: string;
  name?: unknown;
  title?: string;
  username?: string;
  email?: string;
};

export type AdminMutationPayload = Record<string, unknown>;
export type AdminListParams = { page?: number; limit?: number; query?: string };
export type AdminListResponse = {
  success: boolean; items: AdminRecord[]; total: number; page: number; limit: number; pages: number; query: string;
};

export type AdminPermission =
  | 'admin.access' | 'admin.overview.read' | 'users.manage' | 'content.manage'
  | 'moderation.review' | 'security.manage' | 'email.manage' | 'tenants.manage'
  | 'backups.read' | 'backups.create' | 'backups.restore' | 'system.read' | 'audit.read';

export type PermissionRisk = 'low' | 'medium' | 'high' | 'critical';
export type DirectPermissionState = 'inherit' | 'allow' | 'deny';
export type PermissionCatalogRow = {
  name: AdminPermission;
  label: string;
  description: string;
  family: string;
  familyLabel: string;
  risk: PermissionRisk;
  direct: DirectPermissionState;
  inheritedFrom: string[];
  effective: boolean;
};
export type AdminAccessSnapshot = {
  administrator: {
    id: string;
    name: Record<string, unknown>;
    user: { id?: string; name?: string };
    selfProtected: boolean;
    legacySuperAdmin: boolean;
  };
  catalog: PermissionCatalogRow[];
  groups: Array<{
    id: string;
    name: string;
    assigned: boolean;
    permissions: Array<{ name: AdminPermission; permit: boolean }>;
  }>;
};
export type AdminGroupAccessSnapshot = {
  group: { id: string; name: string };
  catalog: Array<Omit<PermissionCatalogRow, 'direct' | 'inheritedFrom' | 'effective'> & { granted: boolean }>;
  administrators: Array<{
    id: string;
    name: Record<string, unknown>;
    user: { id?: string; name?: string };
  }>;
};

export type AdminDashboardResponse = {
  success: boolean;
  counts: Record<string, number>;
  queues: { quarantined: number; emailQueued: number; emailFailed: number; notificationFailed: number };
  authorization: { adminId: string; effectivePermissions: AdminPermission[]; legacySuperAdmin: boolean };
  permissionCatalog: AdminPermission[];
};

export type PeopleItem = {
  id: string; username: string; email: string; name: string; state: string; reason: string;
  verified: boolean; roles: Record<string, unknown>; timeCreated: string | null; contributionCount: number;
  activeSessions: number; activePasskeys: number; activeApiClients: number; lastSeen: string | null;
  signals: string[]; canUndo: boolean;
};

export type PeopleListResponse = {
  success: boolean; items: PeopleItem[]; total: number; page: number; limit: number; pages: number;
  summary: { needsReview: number; quarantined: number; noActivity: number; recentlyJoined: number };
  filters: Record<string, unknown>;
};

export type UserSecurity = {
  user: {
    id: string; username: string; email: string; state: string; isActive: boolean;
    passwordLoginDisabled: boolean; linkedAdminId: string; linkedAccountId: string;
  };
  activeSessions: number; lastSeen: string | null; activePasskeys: number; activeApiClients: number;
  unusedRecoveryCodes: number; verified: boolean; locked: boolean;
};

export type BackupSnapshot = {
  id: string; kind: 'manual' | 'pre_restore'; createdAt: string; complete: boolean;
  totalDocuments: number; totalBytes: number; checksum: string;
  summary: { public: Record<string, number>; private: Record<string, number> };
  offsite: { configured: boolean; verifiedAt: string | null; reference: string };
};

export type RestorePreview = {
  snapshot: BackupSnapshot;
  verification: { valid: boolean; checkedAt: string; expectedChecksum: string; actualChecksum: string };
  isolatedRestoreTest: { supported: boolean; valid: boolean; testedAt: string; message: string; collections: Record<string, number> };
  comparison: Array<{ collection: string; current: number | null; snapshot: number; change: number | null; scope: 'public' | 'private' }>;
  confirmationPhrase: string; automaticPreRestoreSnapshot: boolean; expiresAt: string; token: string;
};

export type HealthStatus = 'healthy' | 'attention' | 'unavailable' | 'unknown';
export type HealthComponent = { status: HealthStatus; summary: string; detail?: Record<string, unknown> };
export type AdminSystemHealth = {
  generatedAt: string; overall: HealthStatus; components: Record<string, HealthComponent>;
  migrationLedger: HealthComponent; recentErrors: HealthComponent;
};

export type OperationalEvent = {
  _id: string; kind: string; severity: 'info' | 'warning' | 'error' | 'critical'; source: string;
  code: string; fingerprint: string; message: string; path: string; requestId: string; occurredAt: string;
};
export type HealthSnapshot = {
  _id: string; overall: HealthStatus; generatedAt: string;
  components: Array<{ key: string; status: HealthStatus; summary: string }>;
};
export type OperationalAlertRule = {
  _id: string; name: string; enabled: boolean; source: 'health' | 'events'; metric: string;
  threshold: number; windowMinutes: number; cooldownMinutes: number; severity: 'warning' | 'critical'; builtIn: boolean;
};
export type OperationalAlert = {
  _id: string; ruleId: string; status: 'active' | 'acknowledged' | 'resolved'; severity: 'warning' | 'critical';
  title: string; summary: string; occurrenceCount: number; firstTriggeredAt: string; lastTriggeredAt: string;
  acknowledgedAt?: string | null; acknowledgement?: string; resolvedAt?: string | null;
};
export type OperationalTelemetry = {
  events: OperationalEvent[]; history: HealthSnapshot[]; rules: OperationalAlertRule[]; alerts: OperationalAlert[];
  retention: { eventsDays: number; healthDays: number; alertsDays: number };
};
