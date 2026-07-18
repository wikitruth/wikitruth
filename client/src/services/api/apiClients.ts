import API_BASE_URL from './baseUrl';
import type { AdminRecord } from './admin';

export type ApiClientScope = 'entries:read' | 'contributions:write' | 'graph:write' | 'civic:write' | 'moderation:write';

export interface ApiClientRecord {
  id: string;
  clientId: string;
  name: string;
  description: string;
  userId: string;
  tokenPrefix: string;
  scopes: ApiClientScope[];
  status: 'active' | 'revoked';
  expiresAt: string | null;
  rateLimitPerMinute: number;
  lastUsedAt?: string | null;
  requestCount: number;
  createDate?: string | null;
  revokedAt?: string | null;
  accountableUser?: { id: string; username: string; email: string };
}

const csrfToken = (): string | null => {
  const match = typeof document === 'undefined' ? null : document.cookie.match(/(?:^|;\s*)_csrfToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method?.toUpperCase() || 'GET';
  const token = ['GET', 'HEAD'].includes(method) ? null : csrfToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'x-csrf-token': token } : {}), ...init?.headers },
    ...init,
  });
  const payload = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) throw new Error(payload.message || `API client request failed: ${response.status}`);
  return payload as T;
}

export const apiClientsApi = {
  list: () => request<{ success: boolean; clients: ApiClientRecord[] }>('/admin/api-clients'),
  users: () => request<AdminRecord[]>('/admin/users'),
  create: (payload: {
    name: string;
    description?: string;
    userId: string;
    scopes: ApiClientScope[];
    expiresAt?: string | null;
    rateLimitPerMinute: number;
  }) => request<{ success: boolean; client: ApiClientRecord; token: string; tokenReturnedOnce: true }>('/admin/api-clients', {
    method: 'POST', body: JSON.stringify(payload),
  }),
  rotate: (id: string) => request<{ success: boolean; client: ApiClientRecord; token: string; tokenReturnedOnce: true }>(`/admin/api-clients/${encodeURIComponent(id)}/rotate`, { method: 'POST' }),
  revoke: (id: string) => request<{ success: boolean; client: ApiClientRecord }>(`/admin/api-clients/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export default apiClientsApi;
