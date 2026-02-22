const request = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Admin request failed: ${response.status}`);
  }

  return response.json();
};

export const adminApi = {
  dashboard: () => request<Record<string, unknown>>('/api/admin'),
  users: () => request<Array<Record<string, unknown>>>('/api/admin/users'),
  accounts: () => request<Array<Record<string, unknown>>>('/api/admin/accounts'),
  administrators: () => request<Array<Record<string, unknown>>>('/api/admin/administrators'),
  adminGroups: () => request<Array<Record<string, unknown>>>('/api/admin/groups'),
  categories: () => request<Array<Record<string, unknown>>>('/api/admin/categories'),
  statuses: () => request<Array<Record<string, unknown>>>('/api/admin/statuses'),
};

export default adminApi;
