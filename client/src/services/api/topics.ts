import apiService from '../api';

export const topicsApi = {
  list: (topicId?: string) => apiService.getTopics(topicId),
  entry: (id: string) => apiService.getTopicEntry(id),
};

export default topicsApi;
