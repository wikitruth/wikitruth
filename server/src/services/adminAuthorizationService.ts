export const ADMIN_PERMISSION_DEFINITIONS = [
  { name: 'admin.access', label: 'Full administrator access', description: 'Grants every current administrator permission.', family: 'platform', familyLabel: 'Platform administration', risk: 'critical' },
  { name: 'admin.overview.read', label: 'View admin overview', description: 'View the administrator dashboard and operational summaries.', family: 'platform', familyLabel: 'Platform administration', risk: 'low' },
  { name: 'users.manage', label: 'Manage people and accounts', description: 'Create, update, restrict, and link user and account records.', family: 'people', familyLabel: 'People and identity', risk: 'high' },
  { name: 'security.manage', label: 'Manage security and access', description: 'Manage administrators, groups, API clients, and security controls.', family: 'people', familyLabel: 'People and identity', risk: 'critical' },
  { name: 'content.manage', label: 'Manage content configuration', description: 'Manage categories, states, and supporting content configuration.', family: 'content', familyLabel: 'Content and moderation', risk: 'medium' },
  { name: 'moderation.review', label: 'Review moderation queues', description: 'Review knowledge health, verdicts, moderation, and anonymous contributions.', family: 'content', familyLabel: 'Content and moderation', risk: 'high' },
  { name: 'email.manage', label: 'Manage email operations', description: 'Configure email providers, previews, tests, and delivery operations.', family: 'communications', familyLabel: 'Communications and tenants', risk: 'high' },
  { name: 'tenants.manage', label: 'Manage tenant applications', description: 'Manage civic application and tenant configuration.', family: 'communications', familyLabel: 'Communications and tenants', risk: 'high' },
  { name: 'backups.read', label: 'View backups', description: 'View backup inventory, status, and verification results.', family: 'operations', familyLabel: 'System operations', risk: 'medium' },
  { name: 'backups.create', label: 'Create backups', description: 'Create on-host database backup snapshots.', family: 'operations', familyLabel: 'System operations', risk: 'high' },
  { name: 'backups.restore', label: 'Test and restore backups', description: 'Run restore previews, restore tests, and approved restoration.', family: 'operations', familyLabel: 'System operations', risk: 'critical' },
  { name: 'system.read', label: 'View system operations', description: 'View health, sanitized telemetry, and operational alerts.', family: 'operations', familyLabel: 'System operations', risk: 'medium' },
  { name: 'audit.read', label: 'View audit events', description: 'View and verify the privileged audit chain.', family: 'operations', familyLabel: 'System operations', risk: 'high' },
] as const;

export const ADMIN_PERMISSIONS = ADMIN_PERMISSION_DEFINITIONS.map((permission) => permission.name);

export type AdminPermission = typeof ADMIN_PERMISSION_DEFINITIONS[number]['name'];

export interface PermissionRow {
  name?: unknown;
  permit?: unknown;
}

export interface AdminAuthorizationRecord {
  _id?: unknown;
  groups?: unknown[];
  permissions?: PermissionRow[];
}

export interface AdminGroupAuthorizationRecord {
  _id?: unknown;
  permissions?: PermissionRow[];
}

export interface AdminAuthorization {
  adminId: string;
  effectivePermissions: AdminPermission[];
  legacySuperAdmin: boolean;
  can: (permission: AdminPermission) => boolean;
}

const permissionSet = new Set<string>(ADMIN_PERMISSIONS);

function normalizedRows(rows: PermissionRow[] | undefined): Array<{ name: AdminPermission; permit: boolean }> {
  return (rows || []).flatMap((row) => {
    const name = String(row?.name || '').trim();
    if (!permissionSet.has(name)) return [];
    return [{ name: name as AdminPermission, permit: Boolean(row.permit) }];
  });
}

export function buildAdminAuthorization(
  admin: AdminAuthorizationRecord,
  groups: AdminGroupAuthorizationRecord[],
): AdminAuthorization {
  const direct = normalizedRows(admin.permissions);
  const groupRows = groups.flatMap((group) => normalizedRows(group.permissions));
  const hasRecognizedAssignment = direct.length > 0 || groupRows.length > 0;
  const legacySuperAdmin = !hasRecognizedAssignment;
  const granted = new Set<AdminPermission>();

  if (legacySuperAdmin) {
    ADMIN_PERMISSIONS.forEach((permission) => granted.add(permission));
  } else {
    groupRows.forEach((row) => {
      if (row.permit) granted.add(row.name);
    });
    direct.forEach((row) => {
      if (row.permit) granted.add(row.name);
      else granted.delete(row.name);
    });
    if (granted.has('admin.access')) {
      ADMIN_PERMISSIONS.forEach((permission) => granted.add(permission));
    }
  }

  return {
    adminId: String(admin._id || ''),
    effectivePermissions: ADMIN_PERMISSIONS.filter((permission) => granted.has(permission)),
    legacySuperAdmin,
    can: (permission) => granted.has(permission),
  };
}

export type AuthorizationModels = {
  Admin: {
    findById: (id: unknown) => { lean: () => Promise<AdminAuthorizationRecord | null> };
  };
  AdminGroup: {
    find: (query: Record<string, unknown>) => { lean: () => Promise<AdminGroupAuthorizationRecord[]> };
  };
};

export async function resolveAdminAuthorization(
  user: Record<string, unknown>,
  models: AuthorizationModels,
): Promise<AdminAuthorization | null> {
  const roles = user.roles && typeof user.roles === 'object'
    ? user.roles as Record<string, unknown>
    : {};
  const adminId = roles.admin;
  if (!adminId) return null;

  const admin = await models.Admin.findById(adminId).lean();
  if (!admin) return null;
  const groupIds = (admin.groups || []).map((group) => String(group || '').trim()).filter(Boolean);
  const groups = groupIds.length
    ? await models.AdminGroup.find({ _id: { $in: groupIds } }).lean()
    : [];
  return buildAdminAuthorization(admin, groups);
}

export function permissionForAdminRequest(
  method: string,
  requestPath: string,
  body: Record<string, unknown> = {},
): AdminPermission {
  const normalizedMethod = method.toUpperCase();
  const path = `/${String(requestPath || '').replace(/^\/+/, '')}`;
  if (path === '/' || path === '') return 'admin.overview.read';
  if (path.startsWith('/people') || path.startsWith('/users') || path.startsWith('/accounts')) return 'users.manage';
  if (path.startsWith('/administrators') || path.startsWith('/groups') || path.startsWith('/api-clients')) return 'security.manage';
  if (path.startsWith('/email-operations')) return 'email.manage';
  if (path.startsWith('/civic-')) return 'tenants.manage';
  if (path.startsWith('/categories') || path.startsWith('/statuses')) return 'content.manage';
  if (path.startsWith('/knowledge-health') || path.startsWith('/verdicts') || path.startsWith('/moderation') || path.startsWith('/anonymous-contributions')) return 'moderation.review';
  if (path.startsWith('/audit-events')) return 'audit.read';
  if (path.startsWith('/operational-telemetry')) return normalizedMethod === 'GET' ? 'system.read' : 'security.manage';
  if (path.startsWith('/system-health')) return 'system.read';
  if (path.startsWith('/db-backup')) {
    if (normalizedMethod === 'GET') return 'backups.read';
    if (path.endsWith('/verify')) return 'backups.read';
    if (path.endsWith('/test') || path.endsWith('/preview')) return 'backups.restore';
    const action = String(body.action || body.buttonAction || 'backup').toLowerCase();
    return action.includes('restore') ? 'backups.restore' : 'backups.create';
  }
  return 'admin.access';
}
