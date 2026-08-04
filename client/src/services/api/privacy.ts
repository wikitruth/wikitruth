import API_BASE_URL from './baseUrl';
import type { PrivacyRequest, PrivacyRequestType } from './privacyTypes';
export type { AnonymizationPreview, PrivacyRequest, PrivacyRequestStatus, PrivacyRequestType } from './privacyTypes';

function csrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)_csrfToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function jsonRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method?.toUpperCase() || 'GET';
  const response = await fetch(`${API_BASE_URL}/privacy${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(!['GET', 'HEAD'].includes(method) && csrfToken() ? { 'x-csrf-token': csrfToken()! } : {}),
      ...init?.headers,
    },
    ...init,
  });
  const payload = await response.json() as T & { message?: string; error?: { message?: string } };
  if (!response.ok) throw new Error(payload.message || payload.error?.message || `Privacy request failed: ${response.status}`);
  return payload;
}

const privacyApi = {
  requests: () => jsonRequest<{ success: boolean; requests: PrivacyRequest[] }>('/requests').then((result) => result.requests),
  createRequest: (type: PrivacyRequestType, reason: string) => jsonRequest<{ success: boolean; request: PrivacyRequest }>('/requests', {
    method: 'POST', body: JSON.stringify({ type, reason }),
  }).then((result) => result.request),
  cancelRequest: (id: string) => jsonRequest<{ success: boolean; request: PrivacyRequest }>(`/requests/${encodeURIComponent(id)}/cancel`, {
    method: 'POST', body: '{}',
  }).then((result) => result.request),
  downloadExport: async (id: string): Promise<{ blob: Blob; filename: string }> => {
    const authorization = await jsonRequest<{ success: boolean; authorization: { token: string; expiresAt: string } }>(
      `/requests/${encodeURIComponent(id)}/download-token`, { method: 'POST', body: '{}' },
    );
    const response = await fetch(`${API_BASE_URL}/privacy/requests/${encodeURIComponent(id)}/download`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(csrfToken() ? { 'x-csrf-token': csrfToken()! } : {}) },
      body: JSON.stringify({ token: authorization.authorization.token }),
    });
    if (!response.ok) {
      const payload = await response.json() as { message?: string; error?: { message?: string } };
      throw new Error(payload.message || payload.error?.message || 'Privacy export download failed');
    }
    const disposition = response.headers.get('content-disposition') || '';
    const filename = disposition.match(/filename="([^"]+)"/)?.[1] || 'wikitruth-privacy-export.json';
    return { blob: await response.blob(), filename };
  },
};

export default privacyApi;
