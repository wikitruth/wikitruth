import apiService from '../api';

export const opinionsApi = {
  list: (topicId?: string) => apiService.getOpinions(topicId),
  entry: (id: string) => apiService.getOpinionEntry(id),
};

export default opinionsApi;
