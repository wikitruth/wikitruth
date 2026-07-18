'use strict';

const {
  CATEGORY_DEFINITIONS,
  FIXTURE_SOURCE,
  assertLocalMongoUri,
  buildTaxonomy,
} = require('../../scripts/setup/local-explore-parity');

describe('local Explore parity setup', function () {
  it('allows only loopback MongoDB targets', function () {
    expect(() => assertLocalMongoUri('mongodb://127.0.0.1:27017/wikitruth')).not.toThrow();
    expect(() => assertLocalMongoUri('mongodb://localhost:27017/wikitruth')).not.toThrow();
    expect(() => assertLocalMongoUri('mongodb://prod.example.test/wikitruth')).toThrow(/Refusing/);
    expect(() => assertLocalMongoUri('mongodb+srv://cluster.example.test/wikitruth')).toThrow(/Refusing/);
  });

  it('builds the production-like category order and visible child previews', function () {
    const taxonomy = buildTaxonomy(new Date('2026-07-18T00:00:00Z'));

    expect(taxonomy.roots.map((topic) => topic.title)).toEqual(
      CATEGORY_DEFINITIONS.map((category) => category.title)
    );
    expect(taxonomy.roots).toHaveLength(14);
    expect(taxonomy.children).toHaveLength(60);
    expect(taxonomy.roots.every((topic) => (
      topic.parentId === null
      && topic.screening.status === 1
      && topic.extras.fixtureSource === FIXTURE_SOURCE
    ))).toBe(true);
    expect(taxonomy.children.every((topic) => (
      topic.parentId.equals(topic.categoryId)
      && topic.screening.status === 1
      && topic.extras.fixtureSource === FIXTURE_SOURCE
    ))).toBe(true);
    expect(taxonomy.roots.find((topic) => topic.title === 'Health & Medicine')?.childrenCount.topics.accepted).toBe(33);
  });
});
