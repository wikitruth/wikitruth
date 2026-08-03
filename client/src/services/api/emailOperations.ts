import API_BASE_URL from './baseUrl';
import fetchWithPasskeyStepUp from './passkeyFetch';

export type EmailProviderType = 'resend' | 'smtp';

export interface EmailProviderRecord {
  id: string;
  name: string;
  type: EmailProviderType;
  enabled: boolean;
  active: boolean;
  fromName: string;
  fromAddress: string;
  host?: string;
  port?: number;
  security?: 'ssl' | 'starttls';
  usernameMasked?: string;
  secretConfigured: boolean;
  webhookSecretConfigured: boolean;
  verifiedAt?: string | null;
  lastVerifiedRecipientMasked?: string;
  lastError?: string;
  editDate: string;
}

export interface EmailProviderInput {
  name: string;
  type: EmailProviderType;
  enabled: boolean;
  fromName: string;
  fromAddress: string;
  host?: string;
  port?: number;
  security?: 'ssl' | 'starttls';
  secrets: { apiKey?: string; username?: string; password?: string; webhookSecret?: string };
}

export interface EmailTemplateRecord {
  key: string;
  name: string;
  purpose: string;
  sampleSubject: string;
}

export interface EmailDeliveryRecord {
  id: string;
  templateKey: string;
  recipientMasked: string;
  status: 'queued' | 'processing' | 'delivered' | 'failed' | 'suppressed';
  providerName: string;
  providerType: string;
  providerMessageId: string;
  attempts: number;
  maxAttempts: number;
  availableAt: string;
  deliveredAt: string | null;
  test: boolean;
  lastError: string;
  errorCode: string;
  createDate: string;
}

export interface EmailOperationsSummary {
  success: boolean;
  providers: EmailProviderRecord[];
  settings: { contactRecipient: string };
  templates: EmailTemplateRecord[];
  deliveries: EmailDeliveryRecord[];
  effectiveProvider: {
    configured: boolean;
    source: 'admin' | 'environment' | 'none';
    id: string;
    name: string;
    type: string;
  };
}

export interface EmailTemplatePreview {
  success: boolean;
  key: string;
  synthetic: boolean;
  subject: string;
  html: string;
  text: string;
}

function csrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)_csrfToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method?.toUpperCase() || 'GET';
  const response = await fetchWithPasskeyStepUp(`${API_BASE_URL}/admin/email-operations${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(!['GET', 'HEAD'].includes(method) && csrfToken() ? { 'x-csrf-token': csrfToken() as string } : {}),
      ...init?.headers,
    },
  });
  const payload = await response.json() as T;
  if (!response.ok) {
    throw new Error(String((payload as Record<string, unknown>)?.message || `Email operations request failed: ${response.status}`));
  }
  return payload;
}

const emailOperationsApi = {
  summary: () => request<EmailOperationsSummary>(''),
  preview: (key: string) => request<EmailTemplatePreview>(`/templates/${encodeURIComponent(key)}/preview`),
  createProvider: (input: EmailProviderInput) => request<{ success: boolean; provider: EmailProviderRecord }>('/providers', {
    method: 'POST', body: JSON.stringify(input),
  }),
  updateProvider: (id: string, input: EmailProviderInput) => request<{ success: boolean; provider: EmailProviderRecord }>(`/providers/${encodeURIComponent(id)}`, {
    method: 'PUT', body: JSON.stringify(input),
  }),
  verifyProvider: (id: string) => request<{ success: boolean; provider: EmailProviderRecord }>(`/providers/${encodeURIComponent(id)}/verify`, { method: 'POST' }),
  activateProvider: (id: string) => request<{ success: boolean; provider: EmailProviderRecord }>(`/providers/${encodeURIComponent(id)}/activate`, { method: 'POST' }),
  setProviderEnabled: (id: string, enabled: boolean) => request<{ success: boolean; provider: EmailProviderRecord }>(`/providers/${encodeURIComponent(id)}/enabled`, {
    method: 'POST', body: JSON.stringify({ enabled }),
  }),
  removeProvider: (id: string) => request<{ success: boolean }>(`/providers/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  saveSettings: (contactRecipient: string) => request<{ success: boolean; settings: { contactRecipient: string } }>('/settings', {
    method: 'PUT', body: JSON.stringify({ contactRecipient }),
  }),
  sendTest: (templateKey: string) => request<{ success: boolean; recipientMasked: string }>('/test', {
    method: 'POST', body: JSON.stringify({ templateKey }),
  }),
  retryDelivery: (id: string) => request<{ success: boolean }>(`/deliveries/${encodeURIComponent(id)}/retry`, { method: 'POST' }),
};

export default emailOperationsApi;
