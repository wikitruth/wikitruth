import API_BASE_URL from './baseUrl';
import type { AdminRecord } from './admin';
import fetchWithPasskeyStepUp from './passkeyFetch';

export type ApiClientScope = 'entries:read' | 'entries:create' | 'entries:propose-edit' | 'graph:write'
  | 'civic:read' | 'civic:contribute' | 'moderation:advise' | 'translations:write'
  | 'debates:participate' | 'agent:runs:read';

export interface ApiClientPolicy {
  tenantIds: string[];
  entryTypes: Array<'topic' | 'argument' | 'question' | 'answer' | 'artifact' | 'issue' | 'opinion'>;
  parentRootIds: string[];
  ownContentOnly: boolean;
  maxVisibility: 'public_only' | 'owned_private';
  sourceRequired: boolean;
  maxBatchSize: number;
}

export interface ApiClientRecord {
  id: string;
  clientId: string;
  name: string;
  description: string;
  userId: string;
  tokenPrefix: string;
  scopes: ApiClientScope[];
  policy: ApiClientPolicy;
  status: 'active' | 'revoked';
  expiresAt: string | null;
  rateLimitPerMinute: number;
  lastUsedAt?: string | null;
  requestCount: number;
  createDate?: string | null;
  revokedAt?: string | null;
  accountableUser?: { id: string; username: string; email: string };
}

export interface AgentUsageReport {
  success: boolean;
  client: { id: string; name: string };
  period: { days: number; from: string; to: string };
  usage: {
    requests: number;
    rateLimitedRequests: number;
    peakRequestsPerMinute: number;
    activeMinutes: number;
  };
  events: Record<string, number>;
  jobs: Record<string, number>;
  advice: Record<string, number>;
}

const csrfToken = (): string | null => {
  const match = typeof document === 'undefined' ? null : document.cookie.match(/(?:^|;\s*)_csrfToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method?.toUpperCase() || 'GET';
  const token = ['GET', 'HEAD'].includes(method) ? null : csrfToken();
  const response = await fetchWithPasskeyStepUp(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'x-csrf-token': token } : {}), ...init?.headers },
    ...init,
  });
  return response.json() as Promise<T>;
}

export const apiClientsApi = {
  list: () => request<{ success: boolean; clients: ApiClientRecord[] }>('/admin/api-clients'),
  usage: (id: string, days = 30) => request<AgentUsageReport>(`/admin/api-clients/${encodeURIComponent(id)}/usage?days=${days}`),
  users: () => request<AdminRecord[]>('/admin/users'),
  create: (payload: {
    name: string;
    description?: string;
    userId: string;
    scopes: ApiClientScope[];
    policy: ApiClientPolicy;
    expiresAt?: string | null;
    rateLimitPerMinute: number;
  }) => request<{ success: boolean; client: ApiClientRecord; token: string; tokenReturnedOnce: true }>('/admin/api-clients', {
    method: 'POST', body: JSON.stringify(payload),
  }),
  rotate: (id: string) => request<{ success: boolean; client: ApiClientRecord; token: string; tokenReturnedOnce: true }>(`/admin/api-clients/${encodeURIComponent(id)}/rotate`, { method: 'POST' }),
  revoke: (id: string) => request<{ success: boolean; client: ApiClientRecord }>(`/admin/api-clients/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export default apiClientsApi;
