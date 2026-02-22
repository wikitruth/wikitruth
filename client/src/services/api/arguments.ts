import apiService from '../api';

export const argumentsApi = {
  list: (topicId?: string) => apiService.getArguments(topicId),
  entry: (id: string) => apiService.getArgumentEntry(id),
};

export default argumentsApi;
