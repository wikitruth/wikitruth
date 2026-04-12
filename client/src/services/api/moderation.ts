import API_BASE_URL from './baseUrl';

export type ModerationTargetKey =
  | 'topic'
  | 'topicLink'
  | 'argument'
  | 'argumentLink'
  | 'artifact'
  | 'question'
  | 'answer'
  | 'issue'
  | 'opinion';

export interface ModerationTarget {
  key: ModerationTargetKey;
  id: string;
}

export interface ModerationStatusOption {
  code: number;
  text: string;
}

export interface ModerationEntry {
  _id?: string;
  title?: string;
  friendlyUrl?: string;
  objectType?: number;
  objectName?: string;
  editDate?: string;
  createDate?: string;
  screening?: {
    status?: number | null;
  };
  verdict?: {
    status?: number | null;
    reasoning?: string | null;
  };
  verdictReasoning?: string | null;
  ownerId?: string | null;
  ownerType?: number | null;
  parentId?: string | null;
  questionId?: string | null;
}

interface ModerationEntryResponse {
  success: boolean;
  target: {
    objectType: number;
    objectName: string;
    id: string;
  };
  entry: ModerationEntry;
  screeningStatuses: ModerationStatusOption[];
  verdictStatuses: ModerationStatusOption[];
}

interface ModerationMutationResponse {
  success: boolean;
  target?: {
    objectType: number;
    objectName: string;
    id: string;
  };
  entry?: ModerationEntry;
}

interface ModerationVerdictsResponse {
  success: boolean;
  entries: ModerationEntry[];
  page: number;
  limit: number;
  total: number;
  verdictStatuses: ModerationStatusOption[];
}

interface ModerationBulkVerdictResponse {
  success: boolean;
  results: Array<{
    id: string;
    success: boolean;
    message?: string;
  }>;
}

interface OwnershipMigrationResponse {
  success: boolean;
  migration?: {
    topicId: string;
    targetScope: 'public' | 'diary';
    username: string | null;
    migratedTopicCount: number;
  };
}

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
    throw new Error(`Moderation request failed: ${response.status}`);
  }

  return response.json();
};

function toQuery(target: ModerationTarget): string {
  return `${encodeURIComponent(target.key)}=${encodeURIComponent(target.id)}`;
}

export const moderationApi = {
  entry: (target: ModerationTarget) =>
    request<ModerationEntryResponse>(`/moderation/entry?${toQuery(target)}`),
  updateScreening: (target: ModerationTarget, status: number) =>
    request<ModerationMutationResponse>(`/moderation/screening?${toQuery(target)}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  updateVerdict: (target: ModerationTarget, status: number) =>
    request<ModerationMutationResponse>(`/moderation/verdict?${toQuery(target)}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  listVerdicts: (params?: {
    objectType?: number;
    status?: number;
    q?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (typeof params?.objectType === 'number') {
      query.set('objectType', String(params.objectType));
    }
    if (typeof params?.status === 'number') {
      query.set('status', String(params.status));
    }
    if (typeof params?.page === 'number') {
      query.set('page', String(params.page));
    }
    if (typeof params?.limit === 'number') {
      query.set('limit', String(params.limit));
    }
    if (params?.q) {
      query.set('q', params.q);
    }
    const suffix = query.toString();
    return request<ModerationVerdictsResponse>(`/moderation/verdicts${suffix ? `?${suffix}` : ''}`);
  },
  bulkUpdateVerdicts: (
    updates: Array<{
      id: string;
      type: number;
      status: number;
      reasoning?: string;
    }>,
  ) =>
    request<ModerationBulkVerdictResponse>('/moderation/verdicts/bulk', {
      method: 'POST',
      body: JSON.stringify({ updates }),
    }),
  takeOwnership: (id: string, objectType: number) =>
    request<ModerationMutationResponse>('/moderation/take-ownership', {
      method: 'POST',
      body: JSON.stringify({ id, type: objectType }),
    }),
  deleteEntry: (id: string, objectType: number) =>
    request<ModerationMutationResponse>('/moderation/delete', {
      method: 'POST',
      body: JSON.stringify({ id, type: objectType }),
    }),
  migrateOwnershipScope: (topicId: string, targetScope: 'public' | 'diary', username?: string) =>
    request<OwnershipMigrationResponse>('/moderation/ownership-migration', {
      method: 'POST',
      body: JSON.stringify({
        topicId,
        targetScope,
        username,
      }),
    }),
};

export default moderationApi;
