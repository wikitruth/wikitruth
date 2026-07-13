'use strict';

const { buildLegacyLinkOperations } = require('../../scripts/migrations/civic-core-tenancy');

describe('civic tenancy migration', () => {
  it('converts legacy Artifact and Issue arrays into idempotent typed upserts', () => {
    const operations = buildLegacyLinkOperations([{
      _id: '66f000000000000000000001',
      createUserId: '66f000000000000000000010',
      artifactIds: ['66f000000000000000000101'],
      issueIds: ['66f000000000000000000102'],
    }]);
    expect(operations).toHaveLength(2);
    expect(operations).toEqual(expect.arrayContaining([
      expect.objectContaining({ updateOne: expect.objectContaining({
        filter: expect.objectContaining({ tenantId: 'fixtheph', relationship: 'evidence', objectType: 6 }), upsert: true,
      }) }),
      expect.objectContaining({ updateOne: expect.objectContaining({
        filter: expect.objectContaining({ tenantId: 'fixtheph', relationship: 'review_issue', objectType: 10 }), upsert: true,
      }) }),
    ]));
  });

  it('does not create unauditable links when the legacy record has no creator', () => {
    expect(buildLegacyLinkOperations([{ _id: 'record', artifactIds: ['artifact'] }])).toEqual([]);
  });
});
