import apiService from '../api';

export const questionsApi = {
  list: (topicId?: string) => apiService.getQuestions(topicId),
  entry: (id: string) => apiService.getQuestionEntry(id),
};

export default questionsApi;
