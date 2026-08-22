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

const DEFAULT_ENTRY_TYPES: ApiClientPolicy['entryTypes'] = [
  'topic', 'argument', 'question', 'answer', 'artifact', 'issue', 'opinion',
];

function normalizeClientRecord(client: ApiClientRecord): ApiClientRecord {
  const policy = client.policy || {} as Partial<ApiClientPolicy>;
  return {
    ...client,
    scopes: Array.isArray(client.scopes) ? client.scopes : [],
    policy: {
      tenantIds: Array.isArray(policy.tenantIds) ? policy.tenantIds : [],
      entryTypes: Array.isArray(policy.entryTypes) && policy.entryTypes.length ? policy.entryTypes : [...DEFAULT_ENTRY_TYPES],
      parentRootIds: Array.isArray(policy.parentRootIds) ? policy.parentRootIds : [],
      ownContentOnly: policy.ownContentOnly !== false,
      maxVisibility: policy.maxVisibility === 'owned_private' ? 'owned_private' : 'public_only',
      sourceRequired: policy.sourceRequired === true,
      maxBatchSize: Number.isFinite(policy.maxBatchSize) ? Math.max(1, Math.min(100, Number(policy.maxBatchSize))) : 25,
    },
  };
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
  list: async () => {
    const response = await request<{ success: boolean; clients: ApiClientRecord[] }>('/admin/api-clients');
    return { ...response, clients: (response.clients || []).map(normalizeClientRecord) };
  },
  usage: (id: string, days = 30) => request<AgentUsageReport>(`/admin/api-clients/${encodeURIComponent(id)}/usage?days=${days}`),
  users: async () => {
    const response = await request<AdminRecord[] | { items?: AdminRecord[] }>('/admin/users?page=1&limit=100');
    return Array.isArray(response) ? response : response.items || [];
  },
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
