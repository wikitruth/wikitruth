import apiService from '../api';

export const groupsApi = {
  list: () => apiService.getGroups(),
  entry: (id: string) => apiService.getGroupEntry(id),
};

export default groupsApi;
