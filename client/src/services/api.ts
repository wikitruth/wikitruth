// API service for making HTTP requests
import type {
  LegacyApiResponse,
  HomeDataResponse,
  SearchResponse,
  TopicEntryResponse,
  ArgumentEntryResponse,
  QuestionEntryResponse,
  IssueEntryResponse,
  OpinionEntryResponse,
  AnswerEntryResponse,
  ArtifactEntryResponse,
  GroupEntryResponse,
  GroupPostsResponse,
  GroupStatsResponse,
  GroupsListResponse,
  MemberProfileResponse,
  MemberTopicsResponse,
  MemberContributionsResponse,
  MemberJournalResponse,
  MemberFollowingResponse,
  MemberPagesResponse,
  MemberPageResponse,
  MemberFastSwitchResponse,
  EntryReactionsResponse,
  ReactionChannel,
  ReactionValue,
} from '../types/api';

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

class ApiService {
  private baseUrl: string;
  private cache: Map<string, { expiresAt: number; value: unknown }>;
  private readonly cacheTtlMs: number;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
    this.cache = new Map();
    this.cacheTtlMs = 60_000;
  }

  private getCsrfToken(): string | null {
    if (typeof document === 'undefined') {
      return null;
    }

    const tokenMatch = document.cookie.match(/(?:^|;\s*)_csrfToken=([^;]+)/);
    return tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;
  }

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const method = options?.method?.toUpperCase() ?? 'GET';
    const cacheKey = `${method}:${url}`;
    const now = Date.now();
    const shouldCacheGet = method === 'GET' && !url.startsWith('/reactions');

    if (shouldCacheGet) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        return cached.value as T;
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string> | undefined),
    };

    if (method !== 'GET' && method !== 'HEAD') {
      const csrfToken = this.getCsrfToken();
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }
    }

    const response = await fetch(`${this.baseUrl}${url}`, {
      ...options,
      credentials: 'same-origin',
      headers: headers,
    });

    if (!response.ok) {
      let errorMessage = `API request failed (${response.status}): ${response.statusText}`;
      let errorCode: string | undefined;
      try {
        const errorPayload = (await response.json()) as {
          error?: string | { code?: string; message?: string };
          message?: string;
          code?: string;
        };

        if (typeof errorPayload?.message === 'string' && errorPayload.message.trim()) {
          errorMessage = errorPayload.message.trim();
        }

        if (typeof errorPayload?.code === 'string' && errorPayload.code.trim()) {
          errorCode = errorPayload.code.trim();
        }

        if (typeof errorPayload?.error === 'string' && errorPayload.error.trim()) {
          errorMessage = errorPayload.error.trim();
        } else if (errorPayload?.error && typeof errorPayload.error === 'object') {
          const nestedMessage = String(errorPayload.error.message || '').trim();
          const nestedCode = String(errorPayload.error.code || '').trim();
          if (nestedMessage) {
            errorMessage = nestedMessage;
          }
          if (nestedCode) {
            errorCode = nestedCode;
          }
        }
      } catch (_err) {
        // Keep default status message when the response has no JSON payload.
      }
      throw new ApiRequestError(response.status, errorMessage, errorCode);
    }

    const payload = (await response.json()) as T;

    if (shouldCacheGet) {
      this.cache.set(cacheKey, {
        expiresAt: now + this.cacheTtlMs,
        value: payload,
      });
    }

    return payload;
  }

  // Home
  async getHomeData(): Promise<HomeDataResponse> {
    return this.request<HomeDataResponse>('/home');
  }

  // Topics
  async getTopics(topicId?: string, view?: string): Promise<LegacyApiResponse> {
    const params = new URLSearchParams();
    if (topicId) params.set('topic', topicId);
    if (view && view !== 'all') params.set('view', view);
    const qs = params.toString();
    const url = qs ? `/topics?${qs}` : '/topics';
    return this.request<LegacyApiResponse>(url);
  }

  async getTopicEntry(id: string): Promise<TopicEntryResponse> {
    return this.request<TopicEntryResponse>(`/topics/entry/${id}`);
  }

  async createTopic(payload: {
    title: string;
    description: string;
    category?: string;
    private?: boolean;
    tags?: string;
    topicId?: string;
    groupId?: string;
  }): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>('/topics', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateTopic(
    id: string,
    payload: {
      title?: string;
      description?: string;
      topicId?: string;
      private?: boolean;
    }
  ): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>(`/topics/entry/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // Arguments
  async getArguments(topicId?: string, view?: string): Promise<LegacyApiResponse> {
    const params = new URLSearchParams();
    if (topicId) params.set('topic', topicId);
    if (view && view !== 'all') params.set('view', view);
    const qs = params.toString();
    const url = qs ? `/arguments?${qs}` : '/arguments';
    return this.request<LegacyApiResponse>(url);
  }

  async getArgumentEntry(id: string): Promise<ArgumentEntryResponse> {
    return this.request<ArgumentEntryResponse>(`/arguments/entry/${id}`);
  }

  async createArgument(payload: {
    title: string;
    description: string;
    verdict?: string;
    topicId?: string;
    private?: boolean;
    sources?: string;
    groupId?: string;
  }): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>('/arguments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateArgument(
    id: string,
    payload: {
      title?: string;
      description?: string;
      verdict?: string;
      verdictReasoning?: string;
      topicId?: string;
      private?: boolean;
      sources?: string;
    }
  ): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>(`/arguments/entry/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // Questions
  async getQuestions(topicId?: string, view?: string): Promise<LegacyApiResponse> {
    const params = new URLSearchParams();
    if (topicId) params.set('topic', topicId);
    if (view && view !== 'all') params.set('view', view);
    const qs = params.toString();
    const url = qs ? `/questions?${qs}` : '/questions';
    return this.request<LegacyApiResponse>(url);
  }

  async getQuestionEntry(id: string): Promise<QuestionEntryResponse> {
    return this.request<QuestionEntryResponse>(`/questions/entry/${id}`);
  }

  async createQuestion(payload: {
    title: string;
    description: string;
    topicId?: string;
    private?: boolean;
    references?: string;
    groupId?: string;
  }): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>('/questions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateQuestion(
    id: string,
    payload: {
      title?: string;
      description?: string;
      topicId?: string;
      private?: boolean;
      references?: string;
    }
  ): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>(`/questions/entry/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // Issues
  async getIssues(topicId?: string, view?: string): Promise<LegacyApiResponse> {
    const params = new URLSearchParams();
    if (topicId) params.set('topic', topicId);
    if (view && view !== 'all') params.set('view', view);
    const qs = params.toString();
    const url = qs ? `/issues?${qs}` : '/issues';
    return this.request<LegacyApiResponse>(url);
  }

  async getIssueEntry(id: string): Promise<IssueEntryResponse> {
    return this.request<IssueEntryResponse>(`/issues/entry/${id}`);
  }

  async createIssue(payload: {
    title: string;
    description: string;
    topicId?: string;
    private?: boolean;
    issueType?: number;
  }): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>('/issues', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateIssue(
    id: string,
    payload: {
      title?: string;
      description?: string;
      topicId?: string;
      private?: boolean;
      issueType?: number;
    }
  ): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>(`/issues/entry/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // Opinions
  async getOpinions(topicId?: string, view?: string): Promise<LegacyApiResponse> {
    const params = new URLSearchParams();
    if (topicId) params.set('topic', topicId);
    if (view && view !== 'all') params.set('view', view);
    const qs = params.toString();
    const url = qs ? `/opinions?${qs}` : '/opinions';
    return this.request<LegacyApiResponse>(url);
  }

  async getOpinionEntry(id: string): Promise<OpinionEntryResponse> {
    return this.request<OpinionEntryResponse>(`/opinions/entry/${id}`);
  }

  async createOpinion(payload: {
    title: string;
    description: string;
    topicId?: string;
    parentId?: string;
    private?: boolean;
  }): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>('/opinions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateOpinion(
    id: string,
    payload: {
      title?: string;
      description?: string;
      topicId?: string;
      private?: boolean;
    }
  ): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>(`/opinions/entry/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // Answers
  async getAnswers(questionId?: string, view?: string): Promise<LegacyApiResponse> {
    const params = new URLSearchParams();
    if (questionId) params.set('question', questionId);
    if (view && view !== 'all') params.set('view', view);
    const qs = params.toString();
    const url = qs ? `/answers?${qs}` : '/answers';
    return this.request<LegacyApiResponse>(url);
  }

  async getAnswerEntry(id: string): Promise<AnswerEntryResponse> {
    return this.request<AnswerEntryResponse>(`/answers/entry/${id}`);
  }

  async createAnswer(payload: {
    title: string;
    description: string;
    questionId: string;
    private?: boolean;
    references?: string;
  }): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>('/answers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateAnswer(
    id: string,
    payload: {
      title?: string;
      description?: string;
      questionId?: string;
      private?: boolean;
      references?: string;
    }
  ): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>(`/answers/entry/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // Artifacts
  async getArtifacts(topicId?: string): Promise<LegacyApiResponse> {
    const url = topicId ? `/artifacts?topic=${topicId}` : '/artifacts';
    return this.request<LegacyApiResponse>(url);
  }

  async getArtifactEntry(id: string): Promise<ArtifactEntryResponse> {
    return this.request<ArtifactEntryResponse>(`/artifacts/entry/${id}`);
  }

  async createArtifact(payload: {
    title: string;
    description: string;
    topicId?: string;
    private?: boolean;
    source?: string;
  }): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>('/artifacts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateArtifact(
    id: string,
    payload: {
      title?: string;
      description?: string;
      topicId?: string;
      private?: boolean;
      source?: string;
    }
  ): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>(`/artifacts/entry/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // Reactions
  async getEntryReactions(payload: {
    id: string;
    objectName: 'topic' | 'argument' | 'question' | 'answer' | 'issue' | 'opinion' | 'artifact';
    objectType?: number;
  }): Promise<EntryReactionsResponse> {
    const params = new URLSearchParams();
    params.set('id', payload.id);
    params.set('objectName', payload.objectName);
    if (typeof payload.objectType === 'number') {
      params.set('objectType', String(payload.objectType));
    }
    return this.request<EntryReactionsResponse>(`/reactions?${params.toString()}`);
  }

  async setEntryReaction(payload: {
    id: string;
    objectName: 'topic' | 'argument' | 'question' | 'answer' | 'issue' | 'opinion' | 'artifact';
    objectType?: number;
    channel: ReactionChannel;
    value: ReactionValue;
  }): Promise<EntryReactionsResponse> {
    return this.request<EntryReactionsResponse>('/reactions', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async clearEntryReaction(payload: {
    id: string;
    objectName: 'topic' | 'argument' | 'question' | 'answer' | 'issue' | 'opinion' | 'artifact';
    objectType?: number;
    channel: ReactionChannel;
  }): Promise<EntryReactionsResponse> {
    const params = new URLSearchParams();
    params.set('id', payload.id);
    params.set('objectName', payload.objectName);
    params.set('channel', payload.channel);
    if (typeof payload.objectType === 'number') {
      params.set('objectType', String(payload.objectType));
    }

    return this.request<EntryReactionsResponse>(`/reactions?${params.toString()}`, {
      method: 'DELETE',
    });
  }

  // Search
  async search(
    query: string,
    options?: {
      tab?: string;
      content?: string;
      limit?: number;
    }
  ): Promise<SearchResponse> {
    const params = new URLSearchParams();
    params.set('q', query);
    if (options?.tab && options.tab !== 'all') {
      params.set('tab', options.tab);
    }
    if (options?.content) {
      params.set('content', options.content);
    }
    if (typeof options?.limit === 'number') {
      params.set('limit', String(options.limit));
    }
    return this.request<SearchResponse>(`/search?${params.toString()}`);
  }

  async sendContactMessage(payload: { name: string; email: string; message: string; recaptchaResponse?: string }): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>('/contact', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Groups
  async getGroups(): Promise<GroupsListResponse> {
    return this.request<GroupsListResponse>('/groups');
  }

  async getGroupEntry(id: string): Promise<GroupEntryResponse> {
    return this.request<GroupEntryResponse>(`/groups/entry/${id}`);
  }

  async getGroupPosts(id: string, limit: number = 25): Promise<GroupPostsResponse> {
    return this.request<GroupPostsResponse>(`/groups/entry/${id}/posts?limit=${encodeURIComponent(String(limit))}`);
  }

  async getGroupStats(id: string): Promise<GroupStatsResponse> {
    return this.request<GroupStatsResponse>(`/groups/entry/${id}/stats`);
  }

  async createGroup(payload: { title: string; description: string; privacyType: number }): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>('/groups', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateGroup(id: string, payload: { title?: string; description?: string; privacyType?: number }): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>(`/groups/entry/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async joinGroup(id: string): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>(`/groups/entry/${id}/members`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async leaveGroup(id: string, userId: string): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>(`/groups/entry/${id}/members/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
  }

  // Members
  async getMembers(): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>('/members');
  }

  async getScreeners(): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>('/members/screeners');
  }

  async getReviewers(): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>('/members/reviewers');
  }

  async getAdministrators(): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>('/members/administrators');
  }

  async getMemberProfile(username: string): Promise<MemberProfileResponse> {
    return this.request<MemberProfileResponse>(`/members/${username}`);
  }

  async getMemberTopics(username: string, limit: number = 50): Promise<MemberTopicsResponse> {
    return this.request<MemberTopicsResponse>(`/members/${encodeURIComponent(username)}/topics?limit=${encodeURIComponent(String(limit))}`);
  }

  async getMemberFollowing(username: string): Promise<MemberFollowingResponse> {
    return this.request<MemberFollowingResponse>(`/members/${encodeURIComponent(username)}/following`);
  }

  async getMemberContributions(username: string, tab: string = 'all'): Promise<MemberContributionsResponse> {
    const query = tab && tab !== 'all' ? `?tab=${encodeURIComponent(tab)}` : '';
    return this.request<MemberContributionsResponse>(`/members/${encodeURIComponent(username)}/contributions${query}`);
  }

  async getMemberJournal(username: string, tab: string = 'all'): Promise<MemberJournalResponse> {
    const query = tab && tab !== 'all' ? `?tab=${encodeURIComponent(tab)}` : '';
    return this.request<MemberJournalResponse>(`/members/${encodeURIComponent(username)}/journal${query}`);
  }

  // Backward compatibility alias for legacy diary naming.
  async getMemberDiary(username: string, tab: string = 'all'): Promise<MemberJournalResponse> {
    return this.getMemberJournal(username, tab);
  }

  async getCurrentMemberProfile(): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>('/members/me');
  }

  async updateCurrentMemberPreferences(payload: { privateProfile: boolean }): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>('/members/me/preferences', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async getCurrentMemberFastSwitchStatus(): Promise<MemberFastSwitchResponse> {
    return this.request<MemberFastSwitchResponse>('/members/me/fast-switch');
  }

  async updateCurrentMemberFastSwitch(payload: { enabled: boolean; pin?: string }): Promise<MemberFastSwitchResponse> {
    return this.request<MemberFastSwitchResponse>('/members/me/fast-switch', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async getMemberPages(username: string): Promise<MemberPagesResponse> {
    return this.request<MemberPagesResponse>(`/members/${encodeURIComponent(username)}/pages`);
  }

  async createMemberPage(username: string, payload: { title: string; content: string }): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>(`/members/${encodeURIComponent(username)}/pages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getMemberPage(username: string, pageId: string): Promise<MemberPageResponse> {
    return this.request<MemberPageResponse>(`/members/${encodeURIComponent(username)}/pages/${encodeURIComponent(pageId)}`);
  }

  async updateMemberPage(username: string, pageId: string, payload: { title?: string; content?: string }): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>(`/members/${encodeURIComponent(username)}/pages/${encodeURIComponent(pageId)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async createOutlineLink(payload: { parentId: string; targetId: string }): Promise<LegacyApiResponse> {
    return this.request<LegacyApiResponse>('/outline/link', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getOutlineTree(rootId?: string, depth: number = 2): Promise<{
    success?: boolean;
    tree?: {
      _id: string;
      title: string;
      objectName: 'topic';
      friendlyUrl?: string;
      children: Array<{
        _id: string;
        title: string;
        objectName: 'topic';
        friendlyUrl?: string;
        children: unknown[];
      }>;
    };
    trees?: Array<{
      _id: string;
      title: string;
      objectName: 'topic';
      friendlyUrl?: string;
      children: unknown[];
    }>;
  }> {
    const params = new URLSearchParams();
    if (rootId) {
      params.set('rootId', rootId);
    }
    params.set('depth', String(depth));
    return this.request(`/outline/tree?${params.toString()}`);
  }

  async searchOutlineTargets(
    query: string,
    options?: {
      types?: 'topic' | 'argument' | 'topic,argument';
      limit?: number;
    },
  ): Promise<{
    success?: boolean;
    results?: Array<{
      _id: string;
      title: string;
      friendlyUrl?: string;
      objectName: 'topic' | 'argument';
    }>;
  }> {
    const params = new URLSearchParams();
    params.set('q', query);
    params.set('types', options?.types || 'topic,argument');
    params.set('limit', String(options?.limit || 20));
    return this.request(`/outline/search?${params.toString()}`);
  }
}

export const apiService = new ApiService();
export default apiService;
