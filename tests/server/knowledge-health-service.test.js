'use strict';

function queryResult(value) {
  const chain = {
    sort: () => chain,
    limit: () => chain,
    select: () => chain,
    lean: async () => value,
  };
  return chain;
}

const reviewTasks = [
  { _id: 'quorum-task', taskType: 'quorum_gap', objectType: 1, objectName: 'topic', objectId: 'topic-1', reason: 'Needs one more reviewer', priority: 'elevated' },
  { _id: 'revalidation-task', taskType: 'revalidation', objectType: 1, objectName: 'topic', objectId: 'topic-2', reason: 'Annual review due', priority: 'normal' },
];

const mockModels = {
  ObjectLink: { distinct: jest.fn().mockResolvedValue([]) },
  Topic: {
    countDocuments: jest.fn().mockResolvedValue(1),
    find: jest.fn(() => queryResult([{ _id: 'topic-1', title: 'Claim without evidence', friendlyUrl: 'claim-without-evidence' }])),
  },
  Argument: { countDocuments: jest.fn().mockResolvedValue(0), find: jest.fn(() => queryResult([])) },
  Answer: { countDocuments: jest.fn().mockResolvedValue(0), find: jest.fn(() => queryResult([])) },
  Issue: {
    countDocuments: jest.fn().mockResolvedValue(1),
    find: jest.fn(() => queryResult([{ _id: 'issue-1', title: 'Critical unresolved issue', friendlyUrl: 'critical-issue', issueType: 10 }])),
  },
  KnowledgeReviewTask: {
    countDocuments: jest.fn((query) => Promise.resolve(reviewTasks.filter((task) => task.taskType === query.taskType).length)),
    find: jest.fn((query) => queryResult(reviewTasks.filter((task) => task.taskType === query.taskType))),
  },
  Artifact: {
    countDocuments: jest.fn().mockResolvedValue(1),
    find: jest.fn((query) => {
      const failure = query['provenance.sourceIntegrity.status']?.$in?.includes('broken');
      return queryResult([{
        _id: failure ? 'artifact-broken' : 'artifact-stale',
        title: failure ? 'Broken source' : 'Source due for recheck',
        friendlyUrl: failure ? 'broken-source' : 'stale-source',
        provenance: { sourceIntegrity: { status: failure ? 'broken' : 'healthy', nextCheckAt: new Date(0) } },
      }]);
    }),
  },
  ReaderSignal: {
    countDocuments: jest.fn().mockResolvedValue(1),
    find: jest.fn(() => queryResult([{ _id: 'signal-1', objectName: 'topic', objectId: 'topic-3', note: 'Looks duplicated' }])),
  },
  Question: {
    countDocuments: jest.fn().mockResolvedValue(1),
    find: jest.fn(() => queryResult([{ _id: 'question-1', title: 'Open question', friendlyUrl: 'open-question' }])),
  },
};

jest.mock('../../server/src/app', () => ({ db: { models: mockModels } }));

describe('knowledge health service', () => {
  it('combines every actionable maintenance queue without changing verdicts', async () => {
    const { buildKnowledgeHealth } = require('../../server/src/services/knowledgeHealthService');
    const health = await buildKnowledgeHealth(10);

    expect(health.total).toBe(8);
    expect(health.queues.map((queue) => queue.key)).toEqual([
      'evidence_gaps', 'critical_issues', 'quorum_gaps', 'revalidation',
      'source_failures', 'stale_sources', 'duplicates', 'unanswered_questions',
    ]);
    expect(health.queues.find((queue) => queue.key === 'quorum_gaps').items[0]).toEqual(expect.objectContaining({
      taskId: 'quorum-task', path: '/topics/entry/topic-1/topic-1',
    }));
    expect(mockModels.ReaderSignal.find).toHaveBeenCalledWith(expect.objectContaining({ signalType: 'duplicate' }));
  });
});
