import API_BASE_URL from './baseUrl';

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
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...defaultHeaders,
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        ...init?.headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      let message = `API request failed: ${response.status}`;
      try {
        const payload = await response.json() as { message?: string; error?: string | { message?: string } };
        if (typeof payload.message === 'string') message = payload.message;
        if (typeof payload.error === 'string') message = payload.error;
        if (payload.error && typeof payload.error === 'object' && payload.error.message) message = payload.error.message;
      } catch {
        // Preserve the status fallback for non-JSON responses.
      }
      throw new Error(message);
    }

    return response.json() as Promise<T>;
  };
};

export default createApiClient;
