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

  // Issues
  async getIssues(topicId?: string) {
    const url = topicId ? `/issues?topic=${topicId}` : '/issues';
    return this.request(url);
  }

  async getIssueEntry(id: string) {
    return this.request(`/issues/entry/${id}`);
  }

  // Opinions
  async getOpinions(topicId?: string) {
    const url = topicId ? `/opinions?topic=${topicId}` : '/opinions';
    return this.request(url);
  }

  async getOpinionEntry(id: string) {
    return this.request(`/opinions/entry/${id}`);
  }

  // Answers
  async getAnswers(questionId?: string) {
    const url = questionId ? `/answers?question=${questionId}` : '/answers';
    return this.request(url);
  }

  async getAnswerEntry(id: string) {
    return this.request(`/answers/entry/${id}`);
  }

  // Artifacts
  async getArtifacts(topicId?: string) {
    const url = topicId ? `/artifacts?topic=${topicId}` : '/artifacts';
    return this.request(url);
  }

  async getArtifactEntry(id: string) {
    return this.request(`/artifacts/entry/${id}`);
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
}

export const apiService = new ApiService();
export default apiService;
