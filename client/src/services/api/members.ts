import apiService from '../api';

export const membersApi = {
  list: () => apiService.getMembers(),
  screeners: () => apiService.getScreeners(),
  reviewers: () => apiService.getReviewers(),
  administrators: () => apiService.getAdministrators(),
  profile: (username: string) => apiService.getMemberProfile(username),
};

export default membersApi;
