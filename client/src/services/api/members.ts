import apiService from '../api';

export const membersApi = {
  list: () => apiService.getMembers(),
  screeners: () => apiService.getScreeners(),
  reviewers: () => apiService.getReviewers(),
  administrators: () => apiService.getAdministrators(),
  profile: (username: string) => apiService.getMemberProfile(username),
  topics: (username: string, limit?: number) => apiService.getMemberTopics(username, limit),
  contributions: (username: string, tab?: string) => apiService.getMemberContributions(username, tab),
  following: (username: string) => apiService.getMemberFollowing(username),
};

export default membersApi;
