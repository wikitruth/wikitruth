import API_BASE_URL from './baseUrl';

export type AdminRecord = Record<string, unknown> & {
  _id?: string;
  id?: string;
  name?: string;
  title?: string;
  username?: string;
  email?: string;
};

const request = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, {
    credentials: 'include',
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
  user: (id: string) => findById(() => adminApi.users(), id),
  account: (id: string) => findById(() => adminApi.accounts(), id),
  administrator: (id: string) => findById(() => adminApi.administrators(), id),
  adminGroup: (id: string) => findById(() => adminApi.adminGroups(), id),
  category: (id: string) => findById(() => adminApi.categories(), id),
  status: (id: string) => findById(() => adminApi.statuses(), id),
};

export default adminApi;
