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
  GroupsListResponse,
  MemberProfileResponse,
  MemberTopicsResponse,
  MemberContributionsResponse,
  MemberDiaryResponse,
  MemberFollowingResponse,
  MemberPagesResponse,
  MemberPageResponse,
  MemberFastSwitchResponse,
} from '../types/api';

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

    if (method === 'GET') {
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
      let errorMessage = `API request failed: ${response.statusText}`;
      try {
        const errorPayload = (await response.json()) as { error?: string; message?: string };
        if (errorPayload?.error || errorPayload?.message) {
          errorMessage = errorPayload.error || errorPayload.message || errorMessage;
        }
      } catch (_err) {
        // Keep default status message when the response has no JSON payload.
      }
      throw new Error(errorMessage);
    }

    const payload = (await response.json()) as T;

    if (method === 'GET') {
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
  async getTopics(topicId?: string): Promise<LegacyApiResponse> {
    const url = topicId ? `/topics?topic=${topicId}` : '/topics';
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

  // Arguments
  async getArguments(topicId?: string): Promise<LegacyApiResponse> {
    const url = topicId ? `/arguments?topic=${topicId}` : '/arguments';
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

  // Questions
  async getQuestions(topicId?: string): Promise<LegacyApiResponse> {
    const url = topicId ? `/questions?topic=${topicId}` : '/questions';
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
  async getIssues(topicId?: string): Promise<LegacyApiResponse> {
    const url = topicId ? `/issues?topic=${topicId}` : '/issues';
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
  async getOpinions(topicId?: string): Promise<LegacyApiResponse> {
    const url = topicId ? `/opinions?topic=${topicId}` : '/opinions';
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
  async getAnswers(questionId?: string): Promise<LegacyApiResponse> {
    const url = questionId ? `/answers?question=${questionId}` : '/answers';
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

  async getMemberDiary(username: string, tab: string = 'all'): Promise<MemberDiaryResponse> {
    const query = tab && tab !== 'all' ? `?tab=${encodeURIComponent(tab)}` : '';
    return this.request<MemberDiaryResponse>(`/members/${encodeURIComponent(username)}/diary${query}`);
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
}

export const apiService = new ApiService();
export default apiService;
