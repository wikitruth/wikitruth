'use strict';

let finalVerdictTotal = 6;
let appealRows = [{ _id: 'resolved', count: 4 }, { _id: 'open', count: 1 }];

function coreCount(modelName, query) {
  const status = query['screening.status'];
  if (query.source) return query['provenance.sourceIntegrity.status'] === 'healthy' ? 6 : 8;
  if ((query.$and || query.$or) && modelName !== 'Topic') return 0;
  if (query.$and) {
    const source = JSON.stringify(query.$and);
    if (source.includes('evidenceRefs')) return Math.max(0, finalVerdictTotal - 1);
    if (source.includes('revalidateAt')) return Math.max(0, finalVerdictTotal - 2);
    if (source.includes('reasoning')) return finalVerdictTotal;
    if (source.includes('dissent')) return 1;
  }
  if (query.$or) return finalVerdictTotal;
  if (modelName === 'Topic') return status === 1 ? 10 : status === 0 ? 2 : status === 3 ? 1 : 0;
  if (modelName === 'Artifact') return status === 1 ? 2 : 0;
  return 0;
}

function model(name) {
  return {
    collection: { collectionName: `${name.toLowerCase()}s` },
    countDocuments: jest.fn((query) => Promise.resolve(coreCount(name, query))),
  };
}

const mockModels = Object.fromEntries([
  'Topic', 'Argument', 'Question', 'Answer', 'Issue', 'Opinion', 'Artifact',
].map((name) => [name, model(name)]));

mockModels.CivicRecord = {
  collection: { collectionName: 'civicrecords' },
  countDocuments: jest.fn((query) => {
    const value = query.status;
    if (value === 'archived') return Promise.resolve(1);
    if (value?.$in?.includes('active')) return Promise.resolve(3);
    if (value?.$in?.includes('draft')) return Promise.resolve(2);
    return Promise.resolve(0);
  }),
};
mockModels.ObjectLink = { distinct: jest.fn().mockResolvedValue([]) };
mockModels.Appeal = {
  aggregate: jest.fn((pipeline) => {
    const objectName = pipeline[0].$match.objectName;
    return Promise.resolve(objectName === 'topic' ? appealRows : []);
  }),
};
mockModels.EntryRevision = {
  aggregate: jest.fn((pipeline) => {
    const objectType = pipeline[0].$match.objectType;
    if (objectType === 1) return Promise.resolve([{ count: 3 }]);
    if (objectType === 40) return Promise.resolve([{ count: 2 }]);
    return Promise.resolve([]);
  }),
};

jest.mock('../../server/src/app', () => ({ db: { models: mockModels } }));

describe('public trust dashboard service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    finalVerdictTotal = 6;
    appealRows = [{ _id: 'resolved', count: 4 }, { _id: 'open', count: 1 }];
  });

  it('publishes public-only lifecycle, quality, and governance aggregates', async () => {
    const { buildPublicTrustDashboard } = require('../../server/src/services/publicTrustService');
    const dashboard = await buildPublicTrustDashboard(new Date('2026-08-05T14:32:00.000Z'));

    expect(dashboard.generatedAt).toBe('2026-08-05T00:00:00.000Z');
    expect(dashboard.summary).toEqual({ publicKnowledge: 21, accepted: 15, pending: 4, archived: 2 });
    expect(dashboard.quality.map((metric) => metric.display)).toEqual(['83%', '67%', '75%', '80%']);
    expect(dashboard.governance.map((metric) => metric.display)).toEqual(['6', '1', '4', '5']);
    expect(dashboard.privacy.exclusions.join(' ')).toMatch(/usernames.*IP addresses/i);
    const responseKeys = [];
    const collectKeys = (value) => {
      if (!value || typeof value !== 'object') return;
      Object.entries(value).forEach(([key, child]) => {
        responseKeys.push(key);
        collectKeys(child);
      });
    };
    collectKeys(dashboard);
    expect(responseKeys).not.toEqual(expect.arrayContaining([
      'createUserId', 'emailAddress', 'username', 'ipAddress', 'sessionId',
    ]));

    const appealPipeline = mockModels.Appeal.aggregate.mock.calls[0][0];
    expect(appealPipeline).toEqual(expect.arrayContaining([
      expect.objectContaining({ $match: expect.objectContaining({ 'target.private': { $ne: true } }) }),
    ]));
  });

  it('removes numerator and denominator details for small public cohorts', async () => {
    finalVerdictTotal = 4;
    appealRows = [{ _id: 'resolved', count: 1 }, { _id: 'open', count: 1 }];
    const { buildPublicTrustDashboard } = require('../../server/src/services/publicTrustService');
    const dashboard = await buildPublicTrustDashboard(new Date('2026-08-05T14:32:00.000Z'));

    const evidence = dashboard.quality.find((metric) => metric.key === 'evidence_linked_verdicts');
    const appeals = dashboard.quality.find((metric) => metric.key === 'resolved_appeals');
    expect(evidence).toEqual(expect.objectContaining({ suppressed: true, suppressionReason: 'small_cohort' }));
    expect(appeals).toEqual(expect.objectContaining({ suppressed: true, suppressionReason: 'small_cohort' }));
    expect(evidence).not.toHaveProperty('numerator');
    expect(evidence).not.toHaveProperty('denominator');
    expect(appeals).not.toHaveProperty('numerator');
    expect(appeals).not.toHaveProperty('denominator');
  });
});
