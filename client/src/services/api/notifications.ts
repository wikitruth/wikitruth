import API_BASE_URL from './baseUrl';

const getCsrfToken = (): string | null => {
  if (typeof document === 'undefined') {
    return null;
  }
  const match = document.cookie.match(/(?:^|;\s*)_csrfToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const method = init?.method?.toUpperCase() ?? 'GET';
  const csrfToken = method === 'GET' || method === 'HEAD' ? null : getCsrfToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Notification request failed: ${response.status}`);
  }

  return response.json();
};

export type NotificationRecord = {
  _id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  objectType?: number;
  objectName?: string;
  objectId?: string;
  readAt?: string | null;
  createDate?: string;
  payload?: Record<string, unknown>;
};

export const notificationsApi = {
  list: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) => {
    const query = new URLSearchParams();
    if (typeof params?.page === 'number') {
      query.set('page', String(params.page));
    }
    if (typeof params?.limit === 'number') {
      query.set('limit', String(params.limit));
    }
    if (params?.unreadOnly) {
      query.set('unreadOnly', '1');
    }
    const suffix = query.toString();
    return request<{
      success: boolean;
      notifications: NotificationRecord[];
      total: number;
      unreadCount: number;
      page: number;
      limit: number;
    }>(`/notifications${suffix ? `?${suffix}` : ''}`);
  },
  summary: () =>
    request<{
      success: boolean;
      unreadCount: number;
    }>('/notifications/summary'),
  markRead: (id: string) =>
    request<{
      success: boolean;
      updated: boolean;
    }>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST', body: JSON.stringify({}) }),
  markAllRead: () =>
    request<{
      success: boolean;
      updated: number;
    }>('/notifications/read-all', { method: 'POST', body: JSON.stringify({}) }),
  setSubscription: (payload: {
    objectName: string;
    objectType?: number;
    id: string;
    enabled: boolean;
    triggers?: string[];
  }) =>
    request<{
      success: boolean;
      subscription: {
        followed: boolean;
        triggers: string[];
      };
    }>('/notifications/subscriptions', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  getSubscription: (objectName: string, id: string, objectType?: number) => {
    const query = new URLSearchParams();
    if (typeof objectType === 'number') {
      query.set('objectType', String(objectType));
    }
    const suffix = query.toString();
    return request<{
      success: boolean;
      subscription: {
        followed: boolean;
        triggers: string[];
      };
    }>(`/notifications/subscriptions/${encodeURIComponent(objectName)}/${encodeURIComponent(id)}${suffix ? `?${suffix}` : ''}`);
  },
};

export default notificationsApi;
