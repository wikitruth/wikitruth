import apiService from '../api';

export const artifactsApi = {
  list: (topicId?: string) => apiService.getArtifacts(topicId),
  entry: (id: string) => apiService.getArtifactEntry(id),
};

export default artifactsApi;
