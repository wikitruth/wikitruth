import {
  ADMIN_PERMISSION_DEFINITIONS,
  ADMIN_PERMISSIONS,
  type AdminAuthorizationRecord,
  type AdminGroupAuthorizationRecord,
  type AdminPermission,
  type PermissionRow,
  buildAdminAuthorization,
} from './adminAuthorizationService';

export type NormalizedPermissionRow = { name: AdminPermission; permit: boolean };

type AdminRecord = AdminAuthorizationRecord & {
  _id?: unknown;
  user?: { id?: unknown; name?: unknown };
  name?: Record<string, unknown>;
};

type GroupRecord = AdminGroupAuthorizationRecord & {
  _id?: unknown;
  name?: unknown;
};

export type AdminAccessModels = {
  Admin: {
    findById: (id: unknown) => { lean: () => Promise<AdminRecord | null> };
    find: (query: Record<string, unknown>) => { lean: () => Promise<AdminRecord[]> };
  };
  AdminGroup: {
    find: (query: Record<string, unknown>) => { lean: () => Promise<GroupRecord[]> };
    findById: (id: unknown) => { lean: () => Promise<GroupRecord | null> };
  };
  User: {
    find: (query: Record<string, unknown>) => { select: (fields: string) => { lean: () => Promise<Array<{ _id?: unknown; isActive?: unknown }>> } };
  };
};

const permissionSet = new Set<string>(ADMIN_PERMISSIONS);

export function normalizePermissionRows(value: unknown): NormalizedPermissionRow[] {
  if (!Array.isArray(value)) {
    throw new Error('permissions must be an array');
  }
  const seen = new Set<string>();
  return value.map((entry) => {
    if (!entry || typeof entry !== 'object') throw new Error('Each permission must be an object');
    const row = entry as PermissionRow;
    const name = String(row.name || '').trim();
    if (!permissionSet.has(name)) throw new Error(`Unknown administrator permission: ${name || '(empty)'}`);
    if (seen.has(name)) throw new Error(`Duplicate administrator permission: ${name}`);
    if (typeof row.permit !== 'boolean') throw new Error(`Permission ${name} requires a boolean permit value`);
    seen.add(name);
    return { name: name as AdminPermission, permit: row.permit };
  });
}

export function normalizeGroupIds(value: unknown, availableIds: string[]): string[] {
  if (!Array.isArray(value)) throw new Error('groups must be an array');
  const available = new Set(availableIds);
  const result = Array.from(new Set(value.map((id) => String(id || '').trim()).filter(Boolean)));
  const unknown = result.find((id) => !available.has(id));
  if (unknown) throw new Error(`Unknown administrator group: ${unknown}`);
  return result;
}

function normalizedKnownRows(value: PermissionRow[] | undefined): NormalizedPermissionRow[] {
  return (value || []).flatMap((row) => {
    const name = String(row.name || '').trim();
    return permissionSet.has(name)
      ? [{ name: name as AdminPermission, permit: Boolean(row.permit) }]
      : [];
  });
}

export function buildAccessSnapshot(admin: AdminRecord, groups: GroupRecord[], actorUserId = '') {
  const assignedIds = new Set((admin.groups || []).map((id) => String(id || '')));
  const assignedGroups = groups.filter((group) => assignedIds.has(String(group._id || '')));
  const authorization = buildAdminAuthorization(admin, assignedGroups);
  const direct = new Map(normalizedKnownRows(admin.permissions).map((row) => [row.name, row.permit]));
  const inherited = new Map<AdminPermission, string[]>();
  assignedGroups.forEach((group) => {
    normalizedKnownRows(group.permissions).forEach((row) => {
      if (!row.permit) return;
      const sources = inherited.get(row.name) || [];
      sources.push(String(group.name || group._id || 'Unnamed group'));
      inherited.set(row.name, sources);
    });
  });
  const effective = new Set(authorization.effectivePermissions);
  return {
    administrator: {
      id: String(admin._id || ''),
      name: admin.name || {},
      user: admin.user || {},
      selfProtected: String(admin.user?.id || '') === String(actorUserId || ''),
      legacySuperAdmin: authorization.legacySuperAdmin,
    },
    catalog: ADMIN_PERMISSION_DEFINITIONS.map((definition) => ({
      ...definition,
      direct: direct.has(definition.name) ? (direct.get(definition.name) ? 'allow' : 'deny') : 'inherit',
      inheritedFrom: inherited.get(definition.name) || [],
      effective: effective.has(definition.name),
    })),
    groups: groups.map((group) => ({
      id: String(group._id || ''),
      name: String(group.name || group._id || ''),
      assigned: assignedIds.has(String(group._id || '')),
      permissions: normalizedKnownRows(group.permissions),
    })),
  };
}

export async function getAdminAccessSnapshot(
  models: AdminAccessModels,
  adminId: string,
  actorUserId = '',
) {
  const [admin, groups] = await Promise.all([
    models.Admin.findById(adminId).lean(),
    models.AdminGroup.find({}).lean(),
  ]);
  if (!admin) return null;
  return buildAccessSnapshot(admin, groups, actorUserId);
}

type AdminOverride = { id: string; permissions: NormalizedPermissionRow[]; groups: string[] };
type GroupOverride = { id: string; permissions: NormalizedPermissionRow[] };

export function countCapableActiveAdministrators(input: {
  admins: AdminRecord[];
  groups: GroupRecord[];
  activeUserIds: Set<string>;
  adminOverride?: AdminOverride;
  groupOverride?: GroupOverride;
}): number {
  const groups = input.groups.map((group) => String(group._id || '') === input.groupOverride?.id
    ? { ...group, permissions: input.groupOverride.permissions }
    : group);
  return input.admins.filter((source) => {
    const admin = String(source._id || '') === input.adminOverride?.id
      ? { ...source, permissions: input.adminOverride.permissions, groups: input.adminOverride.groups }
      : source;
    if (!input.activeUserIds.has(String(admin.user?.id || ''))) return false;
    const groupIds = new Set((admin.groups || []).map((id) => String(id || '')));
    const assignedGroups = groups.filter((group) => groupIds.has(String(group._id || '')));
    return buildAdminAuthorization(admin, assignedGroups).can('security.manage');
  }).length;
}

export async function preservesCapableAdministrator(
  models: AdminAccessModels,
  override: { admin?: AdminOverride; group?: GroupOverride },
): Promise<boolean> {
  const [admins, groups, users] = await Promise.all([
    models.Admin.find({}).lean(),
    models.AdminGroup.find({}).lean(),
    models.User.find({ isActive: 'yes', 'roles.admin': { $ne: null } }).select('_id isActive').lean(),
  ]);
  const activeUserIds = new Set(users.map((user) => String(user._id || '')));
  return countCapableActiveAdministrators({
    admins,
    groups,
    activeUserIds,
    adminOverride: override.admin,
    groupOverride: override.group,
  }) > 0;
}

export async function getGroupAccessSnapshot(models: AdminAccessModels, groupId: string) {
  const [group, admins] = await Promise.all([
    models.AdminGroup.findById(groupId).lean(),
    models.Admin.find({ groups: groupId }).lean(),
  ]);
  if (!group) return null;
  const granted = new Set(normalizedKnownRows(group.permissions).filter((row) => row.permit).map((row) => row.name));
  return {
    group: { id: String(group._id || ''), name: String(group.name || group._id || '') },
    catalog: ADMIN_PERMISSION_DEFINITIONS.map((definition) => ({ ...definition, granted: granted.has(definition.name) })),
    administrators: admins.map((admin) => ({
      id: String(admin._id || ''),
      name: admin.name || {},
      user: admin.user || {},
    })),
  };
}
