import API_BASE_URL from './baseUrl';

const request = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Timeline request failed: ${response.status}`);
  }

  return response.json();
};

export type TimelineEvent = {
  _id?: string;
  scope?: 'entry' | 'privileged';
  eventType?: string;
  objectType?: number;
  objectName?: string;
  objectId?: string;
  actorUserId?: string;
  actorUsername?: string;
  message?: string;
  payload?: Record<string, unknown>;
  createDate?: string;
};

export const timelineApi = {
  list: (params: {
    objectName: string;
    objectType?: number;
    id: string;
    page?: number;
    limit?: number;
    eventTypes?: string[];
  }) => {
    const query = new URLSearchParams();
    query.set('objectName', params.objectName);
    query.set('id', params.id);
    if (typeof params.objectType === 'number') {
      query.set('objectType', String(params.objectType));
    }
    if (typeof params.page === 'number') {
      query.set('page', String(params.page));
    }
    if (typeof params.limit === 'number') {
      query.set('limit', String(params.limit));
    }
    if (Array.isArray(params.eventTypes) && params.eventTypes.length > 0) {
      query.set('eventTypes', params.eventTypes.join(','));
    }
    return request<{
      success: boolean;
      events: TimelineEvent[];
      total: number;
      page: number;
      limit: number;
    }>(`/timeline?${query.toString()}`);
  },
  visualization: (params: { objectName: string; objectType?: number; id: string; days?: number }) => {
    const query = new URLSearchParams();
    query.set('objectName', params.objectName);
    query.set('id', params.id);
    if (typeof params.objectType === 'number') {
      query.set('objectType', String(params.objectType));
    }
    if (typeof params.days === 'number') {
      query.set('days', String(params.days));
    }
    return request<{
      success: boolean;
      days: number;
      buckets: Array<{ day: string; count: number }>;
    }>(`/timeline/visualization?${query.toString()}`);
  },
};

export default timelineApi;
