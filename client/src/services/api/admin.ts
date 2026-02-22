import API_BASE_URL from './baseUrl';

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
  dashboard: () => request<Record<string, unknown>>(`${API_BASE_URL}/admin`),
  users: () => request<Array<Record<string, unknown>>>(`${API_BASE_URL}/admin/users`),
  accounts: () => request<Array<Record<string, unknown>>>(`${API_BASE_URL}/admin/accounts`),
  administrators: () => request<Array<Record<string, unknown>>>(`${API_BASE_URL}/admin/administrators`),
  adminGroups: () => request<Array<Record<string, unknown>>>(`${API_BASE_URL}/admin/groups`),
  categories: () => request<Array<Record<string, unknown>>>(`${API_BASE_URL}/admin/categories`),
  statuses: () => request<Array<Record<string, unknown>>>(`${API_BASE_URL}/admin/statuses`),
};

export default adminApi;
