import API_BASE_URL from './baseUrl';
import fetchWithPasskeyStepUp from './passkeyFetch';

export interface ApiClientOptions {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
}

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)_csrfToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export const createApiClient = (options: ApiClientOptions = {}) => {
  const baseUrl = options.baseUrl ?? API_BASE_URL;
  const defaultHeaders = options.defaultHeaders ?? { 'Content-Type': 'application/json' };

  return async <T>(path: string, init?: RequestInit): Promise<T> => {
    const method = String(init?.method || 'GET').toUpperCase();
    const csrfToken = method === 'GET' || method === 'HEAD' ? null : getCsrfToken();
    const response = await fetchWithPasskeyStepUp(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...defaultHeaders,
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        ...init?.headers,
      },
      credentials: 'include',
    });
    return response.json() as Promise<T>;
  };
};

export default createApiClient;
