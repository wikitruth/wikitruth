import API_BASE_URL from './baseUrl';

interface LoginRequest {
  username: string;
  password: string;
}

interface UserResponse {
  user: Record<string, unknown>;
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
  logout: () =>
    request(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
    }),
  me: () => request<UserResponse>(`${API_BASE_URL}/auth/me`),
  forgotPassword: (email: string) =>
    request(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, password: string) =>
    request(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
};

export default authApi;
