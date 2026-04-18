import API_BASE_URL from './baseUrl';

export type AdminRecord = Record<string, unknown> & {
  _id?: string;
  id?: string;
  name?: string;
  title?: string;
  username?: string;
  email?: string;
};

export type AdminMutationPayload = Record<string, unknown>;

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
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Admin request failed: ${response.status}`);
  }

  return response.json();
};

const findById = async (
  collectionLoader: () => Promise<AdminRecord[]>,
  id: string
): Promise<AdminRecord | null> => {
  const items = await collectionLoader();
  const item = items.find((entry) => String(entry._id || entry.id || '') === id);
  return item || null;
};

export const adminApi = {
  dashboard: () => request<Record<string, unknown>>(`${API_BASE_URL}/admin`),
  users: () => request<AdminRecord[]>(`${API_BASE_URL}/admin/users`),
  accounts: () => request<AdminRecord[]>(`${API_BASE_URL}/admin/accounts`),
  administrators: () => request<AdminRecord[]>(`${API_BASE_URL}/admin/administrators`),
  adminGroups: () => request<AdminRecord[]>(`${API_BASE_URL}/admin/groups`),
  categories: () => request<AdminRecord[]>(`${API_BASE_URL}/admin/categories`),
  statuses: () => request<AdminRecord[]>(`${API_BASE_URL}/admin/statuses`),
  dbBackupStatus: () =>
    request<{
      success: boolean;
      backup: { backupDir: string; privateBackupDir: string; hasGitBackup: boolean };
    }>(`${API_BASE_URL}/admin/db-backup`),
  runDbBackup: () =>
    request<{
      success: boolean;
      message: string;
      backup: { backupDir: string; privateBackupDir: string; startedAt: string };
    }>(`${API_BASE_URL}/admin/db-backup`, {
      method: 'POST',
      body: JSON.stringify({ action: 'backup' }),
    }),
  runDbRestore: (options: {
    restorePublicData: boolean;
    restorePrivateData: boolean;
    confirmText: string;
  }) =>
    request<{
      success: boolean;
      message: string;
      restore: {
        restorePublicData: boolean;
        restorePrivateData: boolean;
        completedAt: string;
        summary: Record<string, unknown>;
      };
    }>(`${API_BASE_URL}/admin/db-backup`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'restore',
        restorePublicData: options.restorePublicData,
        restorePrivateData: options.restorePrivateData,
        confirmText: options.confirmText,
      }),
    }),
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
  user: (id: string) => findById(() => adminApi.users(), id),
  account: (id: string) => findById(() => adminApi.accounts(), id),
  administrator: (id: string) => findById(() => adminApi.administrators(), id),
  adminGroup: (id: string) => findById(() => adminApi.adminGroups(), id),
  category: (id: string) => findById(() => adminApi.categories(), id),
  status: (id: string) => findById(() => adminApi.statuses(), id),
};

export default adminApi;
