import API_BASE_URL from './baseUrl';
import fetchWithPasskeyStepUp from './passkeyFetch';
import type {
  AdminAccessSnapshot, AdminDashboardResponse, AdminGroupAccessSnapshot, AdminListParams, AdminListResponse, AdminMutationPayload, AdminRecord,
  AdminSystemHealth, BackupSnapshot, PeopleListResponse, RestorePreview, UserSecurity,
} from './adminOperationsTypes';
export type {
  AdminDashboardResponse, AdminListParams, AdminListResponse, AdminMutationPayload, AdminPermission,
  AdminRecord, AdminSystemHealth, AdminAccessSnapshot, AdminGroupAccessSnapshot, BackupSnapshot, DirectPermissionState, HealthComponent, HealthStatus, PeopleItem, PermissionCatalogRow,
  PeopleListResponse, RestorePreview, UserSecurity,
} from './adminOperationsTypes';

type MutationResponse = {
  success: boolean;
  user?: AdminRecord;
  account?: AdminRecord;
  admin?: AdminRecord;
  group?: AdminRecord;
  category?: AdminRecord;
  status?: AdminRecord;
};

const getCsrfToken = (): string | null => {
  if (typeof document === 'undefined') {
    return null;
  }

  const match = document.cookie.match(/(?:^|;\s*)_csrfToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const method = init?.method?.toUpperCase() ?? 'GET';
  const csrfToken = method === 'GET' || method === 'HEAD' ? null : getCsrfToken();
  const response = await fetchWithPasskeyStepUp(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      ...init?.headers,
    },
    ...init,
  });

  const payload = await response.json() as T;
  if (!response.ok) {
    const errorPayload = payload as Record<string, unknown>;
    const nestedError = errorPayload.error && typeof errorPayload.error === 'object'
      ? errorPayload.error as Record<string, unknown>
      : null;
    const message = typeof errorPayload.message === 'string'
      ? errorPayload.message
      : typeof nestedError?.message === 'string'
        ? nestedError.message
        : `Admin request failed: ${response.status}`;
    throw new Error(message);
  }

  return payload;
};

const listRequest = (path: string, params: AdminListParams = {}): Promise<AdminListResponse> => {
  const query = new URLSearchParams({
    page: String(params.page || 1),
    limit: String(params.limit || 25),
  });
  if (params.query?.trim()) {
    query.set('q', params.query.trim());
  }
  return request<AdminListResponse>(`${API_BASE_URL}/admin/${path}?${query.toString()}`);
};

const detailRequest = async (path: string, id: string): Promise<AdminRecord | null> => {
  const response = await request<{ success: boolean; item?: AdminRecord }>(
    `${API_BASE_URL}/admin/${path}/${encodeURIComponent(id)}`,
  );
  return response.item || null;
};

export const adminApi = {
  dashboard: () => request<AdminDashboardResponse>(`${API_BASE_URL}/admin`),
  people: (params: {
    page?: number; limit?: number; q?: string; state?: string; verification?: string;
    activity?: string; role?: string; risk?: string; createdDays?: number;
  } = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') query.set(key, String(value));
    });
    return request<PeopleListResponse>(`${API_BASE_URL}/admin/people${query.toString() ? `?${query.toString()}` : ''}`);
  },
  previewPeopleAction: (ids: string[], action: string) => request<{
    success: boolean; previewToken: string; expiresAt: string; action: string;
    targets: Array<{ id: string; username: string; email: string; activeSessions: number; retainedContributions: number; blockers: string[] }>;
    blockerCount: number;
  }>(`${API_BASE_URL}/admin/people/actions/preview`, {
    method: 'POST', body: JSON.stringify({ ids, action }),
  }),
  runPeopleAction: (previewToken: string, reason: string) => request<{
    success: boolean; action: string; actionId: string; affected: number; revokedSessions: number; undoUntil: string | null;
  }>(`${API_BASE_URL}/admin/people/actions`, {
    method: 'POST', body: JSON.stringify({ previewToken, reason }),
  }),
  userSecurity: (id: string) => request<{ success: boolean; security: UserSecurity }>(
    `${API_BASE_URL}/admin/users/${encodeURIComponent(id)}/security`,
  ),
  runUserSecurityAction: (id: string, action: string, reason = '') => request<Record<string, unknown>>(
    `${API_BASE_URL}/admin/users/${encodeURIComponent(id)}/security`,
    { method: 'POST', body: JSON.stringify({ action, reason }) },
  ),
  users: (params?: AdminListParams) => listRequest('users', params),
  accounts: (params?: AdminListParams) => listRequest('accounts', params),
  administrators: (params?: AdminListParams) => listRequest('administrators', params),
  adminGroups: (params?: AdminListParams) => listRequest('groups', params),
  categories: (params?: AdminListParams) => listRequest('categories', params),
  statuses: (params?: AdminListParams) => listRequest('statuses', params),
  dbBackupStatus: () =>
    request<{
      success: boolean;
      backup: { hasGitBackup: boolean; snapshotCount: number; latestSnapshot: BackupSnapshot | null; snapshots: BackupSnapshot[] };
    }>(`${API_BASE_URL}/admin/db-backup`),
  runDbBackup: () =>
    request<{
      success: boolean;
      message: string;
      backup: BackupSnapshot;
    }>(`${API_BASE_URL}/admin/db-backup`, {
      method: 'POST',
      body: JSON.stringify({ action: 'backup' }),
    }),
  verifyBackupSnapshot: (snapshotId: string) => request<Record<string, unknown>>(
    `${API_BASE_URL}/admin/db-backup/snapshots/${encodeURIComponent(snapshotId)}/verify`, { method: 'POST', body: '{}' },
  ),
  testBackupSnapshot: (snapshotId: string) => request<Record<string, unknown>>(
    `${API_BASE_URL}/admin/db-backup/snapshots/${encodeURIComponent(snapshotId)}/test`, { method: 'POST', body: '{}' },
  ),
  previewDbRestore: (snapshotId: string, options: { restorePublicData: boolean; restorePrivateData: boolean }) =>
    request<{ success: boolean; preview: RestorePreview }>(
      `${API_BASE_URL}/admin/db-backup/snapshots/${encodeURIComponent(snapshotId)}/preview`,
      { method: 'POST', body: JSON.stringify(options) },
    ),
  runDbRestore: (options: { snapshotId: string; previewToken: string; confirmText: string }) =>
    request<{
      success: boolean;
      message: string;
      restore: {
        restorePublicData: boolean;
        restorePrivateData: boolean;
        snapshotId: string;
        preRestoreSnapshotId: string;
        completedAt: string;
        summary: Record<string, unknown>;
      };
    }>(`${API_BASE_URL}/admin/db-backup`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'restore',
        snapshotId: options.snapshotId,
        previewToken: options.previewToken,
        confirmText: options.confirmText,
      }),
    }),
  systemHealth: () => request<{ success: boolean; health: AdminSystemHealth }>(`${API_BASE_URL}/admin/system-health`),
  listAuditEvents: (params?: {
    page?: number;
    limit?: number;
    objectType?: number;
    eventTypes?: string;
  }) => {
    const query = new URLSearchParams();
    if (typeof params?.page === 'number') {
      query.set('page', String(params.page));
    }
    if (typeof params?.limit === 'number') {
      query.set('limit', String(params.limit));
    }
    if (typeof params?.objectType === 'number') {
      query.set('objectType', String(params.objectType));
    }
    if (params?.eventTypes) {
      query.set('eventTypes', params.eventTypes);
    }
    const suffix = query.toString();
    return request<{
      success: boolean;
      events: Array<Record<string, unknown>>;
      total: number;
      page: number;
      limit: number;
    }>(`${API_BASE_URL}/admin/audit-events${suffix ? `?${suffix}` : ''}`);
  },
  verifyAuditEvents: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/audit-events/verify`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    const payload = await response.json() as {
      success: boolean;
      verification: {
        valid: boolean;
        verifiedEvents: number;
        legacyEvents: number;
        headSequence: number;
        headHash: string;
        brokenAtSequence: number | null;
        reason: string | null;
      };
    };
    if (!payload.verification) {
      throw new Error(`Audit verification failed: ${response.status}`);
    }
    return payload;
  },
  updateUser: async (id: string, payload: AdminMutationPayload) => {
    const response = await request<MutationResponse>(`${API_BASE_URL}/admin/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return response.user || null;
  },
  createUser: async (payload: AdminMutationPayload) => {
    const response = await request<MutationResponse>(`${API_BASE_URL}/admin/users`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.user || null;
  },
  resetUserPassword: async (id: string, password: string) => {
    const response = await request<MutationResponse>(`${API_BASE_URL}/admin/users/${encodeURIComponent(id)}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password }),
    });
    return response.user || null;
  },
  linkUserAdminRole: async (id: string, adminId: string) => {
    const response = await request<MutationResponse>(`${API_BASE_URL}/admin/users/${encodeURIComponent(id)}/role-admin`, {
      method: 'PUT',
      body: JSON.stringify({ adminId }),
    });
    return response.user || null;
  },
  unlinkUserAdminRole: async (id: string) => {
    const response = await request<MutationResponse>(`${API_BASE_URL}/admin/users/${encodeURIComponent(id)}/role-admin`, {
      method: 'DELETE',
    });
    return response.user || null;
  },
  linkUserAccountRole: async (id: string, accountId: string) => {
    const response = await request<MutationResponse>(`${API_BASE_URL}/admin/users/${encodeURIComponent(id)}/role-account`, {
      method: 'PUT',
      body: JSON.stringify({ accountId }),
    });
    return response.user || null;
  },
  unlinkUserAccountRole: async (id: string) => {
    const response = await request<MutationResponse>(`${API_BASE_URL}/admin/users/${encodeURIComponent(id)}/role-account`, {
      method: 'DELETE',
    });
    return response.user || null;
  },
  updateUserRoles: async (id: string, payload: { screener: boolean; reviewer: boolean }) => {
    const response = await request<MutationResponse>(`${API_BASE_URL}/admin/users/${encodeURIComponent(id)}/roles`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return response.user || null;
  },
  deleteUser: (id: string) =>
    request<{ success: boolean }>(`${API_BASE_URL}/admin/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  createAdminGroup: async (payload: AdminMutationPayload) => {
    const response = await request<MutationResponse>(`${API_BASE_URL}/admin/groups`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.group || null;
  },
  updateAdminGroup: async (id: string, payload: AdminMutationPayload) => {
    const response = await request<MutationResponse>(`${API_BASE_URL}/admin/groups/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return response.group || null;
  },
  deleteAdminGroup: (id: string) =>
    request<{ success: boolean }>(`${API_BASE_URL}/admin/groups/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  createCategory: async (payload: AdminMutationPayload) => {
    const response = await request<MutationResponse>(`${API_BASE_URL}/admin/categories`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.category || null;
  },
  updateCategory: async (id: string, payload: AdminMutationPayload) => {
    const response = await request<MutationResponse>(`${API_BASE_URL}/admin/categories/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return response.category || null;
  },
  deleteCategory: (id: string) =>
    request<{ success: boolean }>(`${API_BASE_URL}/admin/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  createStatus: async (payload: AdminMutationPayload) => {
    const response = await request<MutationResponse>(`${API_BASE_URL}/admin/statuses`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.status || null;
  },
  updateStatus: async (id: string, payload: AdminMutationPayload) => {
    const response = await request<MutationResponse>(`${API_BASE_URL}/admin/statuses/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return response.status || null;
  },
  deleteStatus: (id: string) =>
    request<{ success: boolean }>(`${API_BASE_URL}/admin/statuses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  linkAccountUser: async (id: string, userId: string) => {
    const response = await request<MutationResponse>(`${API_BASE_URL}/admin/accounts/${encodeURIComponent(id)}/user`, {
      method: 'PUT',
      body: JSON.stringify({ userId }),
    });
    return response.account || null;
  },
  unlinkAccountUser: async (id: string) => {
    const response = await request<MutationResponse>(`${API_BASE_URL}/admin/accounts/${encodeURIComponent(id)}/user`, {
      method: 'DELETE',
    });
    return response.account || null;
  },
  deleteAccount: (id: string) =>
    request<{ success: boolean }>(`${API_BASE_URL}/admin/accounts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  addAccountNote: async (id: string, data: string) => {
    const response = await request<MutationResponse>(`${API_BASE_URL}/admin/accounts/${encodeURIComponent(id)}/notes`, {
      method: 'POST',
      body: JSON.stringify({ data }),
    });
    return response.account || null;
  },
  addAccountStatus: async (id: string, statusId: string) => {
    const response = await request<MutationResponse>(`${API_BASE_URL}/admin/accounts/${encodeURIComponent(id)}/status`, {
      method: 'POST',
      body: JSON.stringify({ statusId }),
    });
    return response.account || null;
  },
  updateAdministratorPermissions: async (id: string, permissions: Array<{ name: string; permit: boolean }>) => {
    const response = await request<MutationResponse>(`${API_BASE_URL}/admin/administrators/${encodeURIComponent(id)}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    });
    return response.admin || null;
  },
  administratorAccess: (id: string) => request<{ success: boolean; access: AdminAccessSnapshot }>(
    `${API_BASE_URL}/admin/administrators/${encodeURIComponent(id)}/access`,
  ).then((response) => response.access),
  updateAdministratorAccess: (id: string, input: {
    permissions: Array<{ name: string; permit: boolean }>;
    groups: string[];
  }) => request<{ success: boolean; access: AdminAccessSnapshot }>(
    `${API_BASE_URL}/admin/administrators/${encodeURIComponent(id)}/access`,
    { method: 'PUT', body: JSON.stringify(input) },
  ).then((response) => response.access),
  adminGroupAccess: (id: string) => request<{ success: boolean; access: AdminGroupAccessSnapshot }>(
    `${API_BASE_URL}/admin/groups/${encodeURIComponent(id)}/access`,
  ).then((response) => response.access),
  updateAdminGroupAccess: (id: string, input: {
    name: string;
    permissions: Array<{ name: string; permit: boolean }>;
  }) => request<{ success: boolean; access: AdminGroupAccessSnapshot }>(
    `${API_BASE_URL}/admin/groups/${encodeURIComponent(id)}/access`,
    { method: 'PUT', body: JSON.stringify(input) },
  ).then((response) => response.access),
  updateAdministratorGroups: async (id: string, groups: string[]) => {
    const response = await request<MutationResponse>(`${API_BASE_URL}/admin/administrators/${encodeURIComponent(id)}/groups`, {
      method: 'PUT',
      body: JSON.stringify({ groups }),
    });
    return response.admin || null;
  },
  linkAdministratorUser: async (id: string, userId: string) => {
    const response = await request<MutationResponse>(`${API_BASE_URL}/admin/administrators/${encodeURIComponent(id)}/user`, {
      method: 'PUT',
      body: JSON.stringify({ userId }),
    });
    return response.admin || null;
  },
  unlinkAdministratorUser: async (id: string) => {
    const response = await request<MutationResponse>(`${API_BASE_URL}/admin/administrators/${encodeURIComponent(id)}/user`, {
      method: 'DELETE',
    });
    return response.admin || null;
  },
  deleteAdministrator: (id: string) =>
    request<{ success: boolean }>(`${API_BASE_URL}/admin/administrators/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  user: (id: string) => detailRequest('users', id),
  account: (id: string) => detailRequest('accounts', id),
  administrator: (id: string) => detailRequest('administrators', id),
  adminGroup: (id: string) => detailRequest('groups', id),
  category: (id: string) => detailRequest('categories', id),
  status: (id: string) => detailRequest('statuses', id),
};

export default adminApi;
