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
  voteSummary?: {
    totalVotes: number;
    threshold: number;
    consensusReached: boolean;
    consensusStatus: number | null;
    counts: Array<{ status: number; count: number }>;
  };
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
    targetScope: 'public' | 'journal';
    username: string | null;
    migratedTopicCount: number;
  };
}

interface ConvertTypeResponse {
  success: boolean;
  source: {
    target: {
      objectType: number;
      objectName: string;
      id: string;
    };
    entry: ModerationEntry;
    archived: boolean;
  };
  destination: {
    target: {
      objectType: number;
      objectName: string;
      id: string;
    };
    entry: ModerationEntry;
    path: string;
  };
}

interface VerdictVoteResponse {
  success: boolean;
  vote: Record<string, unknown>;
  summary: {
    threshold: number;
    totalVotes: number;
    consensusReached: boolean;
    consensusStatus: number | null;
  };
}

interface VerdictVotesListResponse {
  success: boolean;
  votes: Array<Record<string, unknown>>;
  summary: {
    threshold: number;
    totalVotes: number;
    consensusReached: boolean;
    consensusStatus: number | null;
  };
}

export interface DuplicateCandidate {
  id: string;
  title: string;
  editDate: string | null;
  rule: 'exact_title' | 'exact_content' | 'near_title';
  score: number;
}

interface DuplicateCandidatesResponse {
  success: boolean;
  candidates: DuplicateCandidate[];
}

interface MergeResponse {
  success: boolean;
  merge: {
    source: { objectType: number; id: string };
    target: { objectType: number; id: string; path: string };
    movedRelationships: Record<string, number>;
    redirectId: string;
  };
}

export interface ChangeRequest {
  _id: string;
  objectType: number;
  objectId: string;
  baseRevisionId: string;
  baseRevisionNumber: number;
  proposedChanges: Record<string, unknown>;
  summary: string;
  status: 'open' | 'accepted' | 'partially_accepted' | 'rejected' | 'stale' | 'withdrawn';
  acceptedFields?: string[];
  decisionNote?: string;
  createDate?: string;
  createUsername?: string;
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
    const errorPayload = await response.json().catch(() => null) as { message?: unknown } | null;
    throw new Error(String(errorPayload?.message || `Moderation request failed: ${response.status}`));
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
  listDuplicates: (target: ModerationTarget) =>
    request<DuplicateCandidatesResponse>(`/moderation/duplicates?${toQuery(target)}`),
  mergeDuplicate: (payload: {
    objectType: number;
    sourceId: string;
    targetId: string;
    sourceEditDate?: string;
    targetEditDate?: string | null;
    reason: string;
  }) =>
    request<MergeResponse>('/moderation/merge', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  submitChangeRequest: (
    target: ModerationTarget,
    payload: { proposedChanges: Record<string, unknown>; summary: string },
  ) =>
    request<{ success: boolean; request: ChangeRequest }>(`/moderation/change-requests?${toQuery(target)}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  listChangeRequests: (target: ModerationTarget, status?: ChangeRequest['status']) => {
    const query = new URLSearchParams(toQuery(target));
    if (status) {
      query.set('status', status);
    }
    return request<{ success: boolean; requests: ChangeRequest[] }>(`/moderation/change-requests?${query.toString()}`);
  },
  resolveChangeRequest: (
    id: string,
    payload: { action: 'accept' | 'reject'; acceptedFields?: string[]; decisionNote: string },
  ) =>
    request<{ success: boolean; request: ChangeRequest }>(`/moderation/change-requests/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  rollbackEntry: (payload: {
    objectType: number;
    objectId: string;
    revisionId: string;
    reason: string;
  }) =>
    request<{ success: boolean; revision: Record<string, unknown> }>('/moderation/rollback', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateVerdict: (target: ModerationTarget, status: number) =>
    request<ModerationMutationResponse>(`/moderation/verdict?${toQuery(target)}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  convertEntryType: (
    target: ModerationTarget,
    payload: {
      targetType: 'topic' | 'argument';
      archiveSource?: boolean;
      reason?: string;
    },
  ) =>
    request<ConvertTypeResponse>(`/moderation/convert-type?${toQuery(target)}`, {
      method: 'POST',
      body: JSON.stringify(payload),
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
  migrateOwnershipScope: (topicId: string, targetScope: 'public' | 'journal', username?: string) =>
    request<OwnershipMigrationResponse>('/moderation/ownership-migration', {
      method: 'POST',
      body: JSON.stringify({
        topicId,
        targetScope,
        username,
      }),
      }),
  submitVerdictVote: (
    target: ModerationTarget,
    payload: {
      status: number;
      rationale?: string;
    },
  ) =>
    request<VerdictVoteResponse>(`/moderation/verdict-votes?${toQuery(target)}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  listVerdictVotes: (target: ModerationTarget) =>
    request<VerdictVotesListResponse>(`/moderation/verdict-votes?${toQuery(target)}`),
  submitReaderSignal: (
    target: ModerationTarget,
    payload: {
      signalType: 'controversial' | 'incorrect_verdict' | 'needs_reevaluation' | 'wrong_category';
      note?: string;
    },
  ) =>
    request<{ success: boolean; signal: Record<string, unknown> }>(`/moderation/signals?${toQuery(target)}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  listReaderSignals: (params?: { status?: string; signalType?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) {
      query.set('status', params.status);
    }
    if (params?.signalType) {
      query.set('signalType', params.signalType);
    }
    const suffix = query.toString();
    return request<{ success: boolean; signals: Array<Record<string, unknown>> }>(
      `/moderation/signals${suffix ? `?${suffix}` : ''}`,
    );
  },
  updateReaderSignal: (id: string, payload: { status?: string; resolutionNote?: string }) =>
    request<{ success: boolean; signal: Record<string, unknown> }>(`/moderation/signals/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  submitAppeal: (
    target: ModerationTarget,
    payload: {
      reasonType?: 'verdict' | 'issue' | 'general';
      note: string;
    },
  ) =>
    request<{ success: boolean; appeal: Record<string, unknown> }>(`/moderation/appeals?${toQuery(target)}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  listAppeals: (params?: { status?: string; reasonType?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) {
      query.set('status', params.status);
    }
    if (params?.reasonType) {
      query.set('reasonType', params.reasonType);
    }
    const suffix = query.toString();
    return request<{ success: boolean; appeals: Array<Record<string, unknown>> }>(
      `/moderation/appeals${suffix ? `?${suffix}` : ''}`,
    );
  },
  updateAppeal: (id: string, payload: { status?: string; resolutionNote?: string }) =>
    request<{ success: boolean; appeal: Record<string, unknown> }>(`/moderation/appeals/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};

export default moderationApi;
