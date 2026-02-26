import apiService from '../api';

export const groupsApi = {
  list: () => apiService.getGroups(),
  entry: (id: string) => apiService.getGroupEntry(id),
  posts: (id: string, limit?: number) => apiService.getGroupPosts(id, limit),
};

export default groupsApi;
