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
  updateUser: async (id: string, payload: AdminMutationPayload) => {
    const response = await request<MutationResponse>(`${API_BASE_URL}/admin/users/${encodeURIComponent(id)}`, {
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
  user: (id: string) => findById(() => adminApi.users(), id),
  account: (id: string) => findById(() => adminApi.accounts(), id),
  administrator: (id: string) => findById(() => adminApi.administrators(), id),
  adminGroup: (id: string) => findById(() => adminApi.adminGroups(), id),
  category: (id: string) => findById(() => adminApi.categories(), id),
  status: (id: string) => findById(() => adminApi.statuses(), id),
};

export default adminApi;
