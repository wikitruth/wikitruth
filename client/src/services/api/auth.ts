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

const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Auth request failed: ${response.status}`);
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
};

export default authApi;
