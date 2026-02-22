import apiService from '../api';

export const answersApi = {
  list: (questionId?: string) => apiService.getAnswers(questionId),
  entry: (id: string) => apiService.getAnswerEntry(id),
};

export default answersApi;
