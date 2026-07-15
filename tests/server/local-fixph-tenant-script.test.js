'use strict';

const {
  assertLocalMongoUri,
  buildJurisdictions,
  buildRecords,
} = require('../../scripts/setup/local-fixph-tenant');

describe('local FixPH tenant setup', function () {
  it('allows only loopback MongoDB targets', function () {
    expect(() => assertLocalMongoUri('mongodb://127.0.0.1:27017/wikitruth')).not.toThrow();
    expect(() => assertLocalMongoUri('mongodb://localhost:27017/wikitruth')).not.toThrow();
    expect(() => assertLocalMongoUri('mongodb://prod.example.test/wikitruth')).toThrow(/Refusing/);
    expect(() => assertLocalMongoUri('mongodb+srv://cluster.example.test/wikitruth')).toThrow(/Refusing/);
  });

  it('covers every supported civic record kind with deterministic fixtures', function () {
    const records = buildRecords(new Date('2026-07-15T00:00:00Z'));
    expect(new Set(records.map((record) => record.kind))).toEqual(new Set([
      'institution', 'office', 'person', 'project', 'observation',
      'incident', 'action', 'election', 'candidate', 'history',
    ]));
    expect(records.every((record) => record.tenantId === 'fixtheph' && record.private === false)).toBe(true);
    expect(buildJurisdictions(new Date()).map((item) => item.levelKey)).toEqual(['country', 'region', 'city']);
  });
});
