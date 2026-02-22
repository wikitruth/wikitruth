import apiService from '../api';

export const issuesApi = {
  list: (topicId?: string) => apiService.getIssues(topicId),
  entry: (id: string) => apiService.getIssueEntry(id),
};

export default issuesApi;
