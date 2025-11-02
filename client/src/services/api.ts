// API service for making HTTP requests

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
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

    return response.json();
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

  // Arguments
  async getArguments(topicId?: string) {
    const url = topicId ? `/arguments?topic=${topicId}` : '/arguments';
    return this.request(url);
  }

  async getArgumentEntry(id: string) {
    return this.request(`/arguments/entry/${id}`);
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
