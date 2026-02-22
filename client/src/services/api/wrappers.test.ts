import { topicsApi } from './topics';
import { argumentsApi } from './arguments';
import { questionsApi } from './questions';
import { answersApi } from './answers';
import { issuesApi } from './issues';
import { opinionsApi } from './opinions';
import { artifactsApi } from './artifacts';
import { groupsApi } from './groups';
import { membersApi } from './members';

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    getTopics: jest.fn().mockResolvedValue([]),
    getTopicEntry: jest.fn().mockResolvedValue({}),
    getArguments: jest.fn().mockResolvedValue([]),
    getArgumentEntry: jest.fn().mockResolvedValue({}),
    getQuestions: jest.fn().mockResolvedValue([]),
    getQuestionEntry: jest.fn().mockResolvedValue({}),
    getAnswers: jest.fn().mockResolvedValue([]),
    getAnswerEntry: jest.fn().mockResolvedValue({}),
    getIssues: jest.fn().mockResolvedValue([]),
    getIssueEntry: jest.fn().mockResolvedValue({}),
    getOpinions: jest.fn().mockResolvedValue([]),
    getOpinionEntry: jest.fn().mockResolvedValue({}),
    getArtifacts: jest.fn().mockResolvedValue([]),
    getArtifactEntry: jest.fn().mockResolvedValue({}),
    getGroups: jest.fn().mockResolvedValue([]),
    getGroupEntry: jest.fn().mockResolvedValue({}),
    getMembers: jest.fn().mockResolvedValue([]),
    getScreeners: jest.fn().mockResolvedValue([]),
    getReviewers: jest.fn().mockResolvedValue([]),
    getAdministrators: jest.fn().mockResolvedValue([]),
    getMemberProfile: jest.fn().mockResolvedValue({}),
  },
}));

describe('api wrappers', () => {
  it('call core wrapper methods', async () => {
    await topicsApi.list();
    await topicsApi.entry('1');

    await argumentsApi.list();
    await argumentsApi.entry('1');

    await questionsApi.list();
    await questionsApi.entry('1');

    await answersApi.list();
    await answersApi.entry('1');

    await issuesApi.list();
    await issuesApi.entry('1');

    await opinionsApi.list();
    await opinionsApi.entry('1');

    await artifactsApi.list();
    await artifactsApi.entry('1');

    await groupsApi.list();
    await groupsApi.entry('1');

    await membersApi.list();
    await membersApi.screeners();
    await membersApi.reviewers();
    await membersApi.administrators();
    await membersApi.profile('demo');
  });
});
