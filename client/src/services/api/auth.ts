import API_BASE_URL from './baseUrl';
import type { User } from '../../types';

interface LoginRequest {
  username: string;
  password: string;
}

interface SignupRequest {
  username: string;
  email: string;
  password: string;
}

interface UserResponse {
  success?: boolean;
  user: User | null;
}

interface VerificationStatusResponse {
  success: boolean;
  verification: {
    required: boolean;
    isVerified: boolean;
    email: string;
    hasPendingToken: boolean;
  };
}

interface FastSwitchResponse {
  success?: boolean;
  message?: string;
  user: User | null;
}

interface AccountSettingsResponse {
  success?: boolean;
  account?: {
    first?: string;
    middle?: string;
    last?: string;
    company?: string;
    phone?: string;
    zip?: string;
  };
  identity?: {
    username?: string;
    email?: string;
  };
  providers?: Record<string, boolean>;
  social?: Record<string, boolean>;
}

export interface AuthProvidersResponse {
  success?: boolean;
  providers: Record<string, boolean>;
}

const getCsrfToken = (): string | null => {
  if (typeof document === 'undefined') {
    return null;
  }

  const match = document.cookie.match(/(?:^|;\s*)_csrfToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const method = init?.method?.toUpperCase() ?? 'GET';
  const csrfToken = method === 'GET' || method === 'HEAD' ? null : getCsrfToken();
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    let errorMessage = `Auth request failed: ${response.status}`;
    try {
      const payload = (await response.json()) as { message?: string; error?: string };
      if (payload?.message || payload?.error) {
        errorMessage = payload.message || payload.error || errorMessage;
      }
    } catch (_err) {
      // Keep default status-based error message when no JSON payload is returned.
    }
    throw new Error(errorMessage);
  }

  return response.json();
};

export const authApi = {
  login: (payload: LoginRequest) =>
    request<UserResponse>(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  signup: (payload: SignupRequest) =>
    request<UserResponse>(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logout: () =>
    request(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
    }),
  me: () => request<UserResponse>(`${API_BASE_URL}/auth/me`),
  providers: () => request<AuthProvidersResponse>(`${API_BASE_URL}/auth/providers`),
  forgotPassword: (email: string) =>
    request<{ success: boolean; message: string; debug?: { email: string; token: string } }>(
      `${API_BASE_URL}/auth/forgot-password`,
      {
      method: 'POST',
      body: JSON.stringify({ email }),
      }
    ),
  resetPassword: (email: string, token: string, password: string) =>
    request<{ success: boolean; message: string }>(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ email, token, password }),
    }),
  verificationStatus: () => request<VerificationStatusResponse>(`${API_BASE_URL}/auth/verification-status`),
  resendVerification: (email: string) =>
    request<{ success: boolean; message: string; debug?: { email: string; token: string } }>(
      `${API_BASE_URL}/auth/verification-resend`,
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      }
    ),
  confirmVerification: (token: string) =>
    request<{ success: boolean; message: string }>(`${API_BASE_URL}/auth/verification-confirm`, {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  fastSwitch: (pin: string) =>
    request<FastSwitchResponse>(`${API_BASE_URL}/auth/fast-switch`, {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),
  accountSettings: () =>
    request<AccountSettingsResponse>(`${API_BASE_URL}/auth/account-settings`),
  updateAccountContact: (payload: {
    first: string;
    middle?: string;
    last: string;
    company?: string;
    phone?: string;
    zip?: string;
  }) =>
    request<{ success: boolean; message?: string }>(`${API_BASE_URL}/auth/account-settings/contact`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  updateAccountIdentity: (payload: { username: string; email: string }) =>
    request<{ success: boolean; message?: string }>(`${API_BASE_URL}/auth/account-settings/identity`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  updateAccountPassword: (payload: { newPassword: string; confirm: string }) =>
    request<{ success: boolean; message?: string }>(`${API_BASE_URL}/auth/account-settings/password`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};

export default authApi;
