// API service for making HTTP requests

class ApiService {
  private baseUrl: string;
  private cache: Map<string, { expiresAt: number; value: unknown }>;
  private readonly cacheTtlMs: number;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
    this.cache = new Map();
    this.cacheTtlMs = 60_000;
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

    const response = await fetch(`${this.baseUrl}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
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
  async getHomeData() {
    return this.request('/home');
  }

  // Topics
  async getTopics(topicId?: string) {
    const url = topicId ? `/topics?topic=${topicId}` : '/topics';
    return this.request(url);
  }

  async getTopicEntry(id: string) {
    return this.request(`/topics/entry/${id}`);
  }

  async createTopic(payload: {
    title: string;
    description: string;
    category?: string;
    private?: boolean;
    tags?: string;
    topicId?: string;
  }) {
    return this.request('/topics', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Arguments
  async getArguments(topicId?: string) {
    const url = topicId ? `/arguments?topic=${topicId}` : '/arguments';
    return this.request(url);
  }

  async getArgumentEntry(id: string) {
    return this.request(`/arguments/entry/${id}`);
  }

  async createArgument(payload: {
    title: string;
    description: string;
    verdict?: string;
    topicId?: string;
    private?: boolean;
    sources?: string;
  }) {
    return this.request('/arguments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Questions
  async getQuestions(topicId?: string) {
    const url = topicId ? `/questions?topic=${topicId}` : '/questions';
    return this.request(url);
  }

  async getQuestionEntry(id: string) {
    return this.request(`/questions/entry/${id}`);
  }

  async createQuestion(payload: {
    title: string;
    description: string;
    topicId?: string;
    private?: boolean;
    references?: string;
  }) {
    return this.request('/questions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Issues
  async getIssues(topicId?: string) {
    const url = topicId ? `/issues?topic=${topicId}` : '/issues';
    return this.request(url);
  }

  async getIssueEntry(id: string) {
    return this.request(`/issues/entry/${id}`);
  }

  async createIssue(payload: {
    title: string;
    description: string;
    topicId?: string;
    private?: boolean;
    issueType?: number;
  }) {
    return this.request('/issues', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Opinions
  async getOpinions(topicId?: string) {
    const url = topicId ? `/opinions?topic=${topicId}` : '/opinions';
    return this.request(url);
  }

  async getOpinionEntry(id: string) {
    return this.request(`/opinions/entry/${id}`);
  }

  async createOpinion(payload: {
    title: string;
    description: string;
    topicId?: string;
    parentId?: string;
    private?: boolean;
  }) {
    return this.request('/opinions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Answers
  async getAnswers(questionId?: string) {
    const url = questionId ? `/answers?question=${questionId}` : '/answers';
    return this.request(url);
  }

  async getAnswerEntry(id: string) {
    return this.request(`/answers/entry/${id}`);
  }

  async createAnswer(payload: {
    title: string;
    description: string;
    questionId: string;
    private?: boolean;
    references?: string;
  }) {
    return this.request('/answers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Artifacts
  async getArtifacts(topicId?: string) {
    const url = topicId ? `/artifacts?topic=${topicId}` : '/artifacts';
    return this.request(url);
  }

  async getArtifactEntry(id: string) {
    return this.request(`/artifacts/entry/${id}`);
  }

  async createArtifact(payload: {
    title: string;
    description: string;
    topicId?: string;
    private?: boolean;
    source?: string;
  }) {
    return this.request('/artifacts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Search
  async search(query: string) {
    return this.request(`/search?q=${encodeURIComponent(query)}`);
  }

  // Groups
  async getGroups() {
    return this.request('/groups');
  }

  async getGroupEntry(id: string) {
    return this.request(`/groups/entry/${id}`);
  }

  async createGroup(payload: { title: string; description: string; privacyType: number }) {
    return this.request('/groups', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateGroup(id: string, payload: { title?: string; description?: string; privacyType?: number }) {
    return this.request(`/groups/entry/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async joinGroup(id: string) {
    return this.request(`/groups/entry/${id}/members`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async leaveGroup(id: string, userId: string) {
    return this.request(`/groups/entry/${id}/members/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
  }

  // Members
  async getMembers() {
    return this.request('/members');
  }

  async getScreeners() {
    return this.request('/members/screeners');
  }

  async getReviewers() {
    return this.request('/members/reviewers');
  }

  async getAdministrators() {
    return this.request('/members/administrators');
  }

  async getMemberProfile(username: string) {
    return this.request(`/members/${username}`);
  }

  async getCurrentMemberProfile() {
    return this.request('/members/me');
  }

  async updateCurrentMemberPreferences(payload: { privateProfile: boolean }) {
    return this.request('/members/me/preferences', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async getMemberPages(username: string) {
    return this.request(`/members/${encodeURIComponent(username)}/pages`);
  }

  async createMemberPage(username: string, payload: { title: string; content: string }) {
    return this.request(`/members/${encodeURIComponent(username)}/pages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getMemberPage(username: string, pageId: string) {
    return this.request(`/members/${encodeURIComponent(username)}/pages/${encodeURIComponent(pageId)}`);
  }

  async updateMemberPage(username: string, pageId: string, payload: { title?: string; content?: string }) {
    return this.request(`/members/${encodeURIComponent(username)}/pages/${encodeURIComponent(pageId)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }
}

export const apiService = new ApiService();
export default apiService;
