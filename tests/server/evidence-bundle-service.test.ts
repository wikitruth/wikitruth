const questionFindOne = jest.fn();
const artifactFind = jest.fn();
const objectLinkFind = jest.fn();
const revisionFindOne = jest.fn();
const translationFind = jest.fn();

function query(value: unknown) {
  const chain = {
    select: jest.fn(() => chain), sort: jest.fn(() => chain),
    lean: jest.fn(async () => value),
  };
  return chain;
}

jest.mock('../../server/src/app', () => ({ db: { models: {
  Question: { findOne: (...args: unknown[]) => questionFindOne(...args) },
  Artifact: { find: (...args: unknown[]) => artifactFind(...args) },
  ObjectLink: { find: (...args: unknown[]) => objectLinkFind(...args) },
  EntryRevision: { findOne: (...args: unknown[]) => revisionFindOne(...args) },
  EntryTranslation: { find: (...args: unknown[]) => translationFind(...args) },
} } }));

import { buildPublicEvidenceBundle, evidenceBundleJsonLd } from '../../server/src/services/evidenceBundleService';

describe('public evidence bundles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    questionFindOne.mockReturnValue(query({
      _id: '507f1f77bcf86cd799439011', title: 'What do the public records show?',
      content: 'A reviewed public question.', friendlyUrl: 'public-records',
      private: false, screening: { status: 1 }, editDate: new Date('2026-07-28T00:00:00Z'),
    }));
    objectLinkFind.mockReturnValue(query([
      { leftType: 3, leftId: '507f1f77bcf86cd799439011', rightType: 6, rightId: '507f1f77bcf86cd799439012', relationship: 'evidence', extras: { citation: { page: '4' } } },
      { leftType: 3, leftId: '507f1f77bcf86cd799439011', rightType: 6, rightId: '507f1f77bcf86cd799439013', relationship: 'background' },
    ]));
    artifactFind.mockReturnValue(query([{
      _id: '507f1f77bcf86cd799439012', title: 'Published audit', friendlyUrl: 'published-audit',
      artifactType: 'document', source: 'https://records.example/audit', provenance: { originType: 'primary' },
    }]));
    revisionFindOne.mockReturnValue(query({
      _id: '507f1f77bcf86cd799439014', revisionNumber: 2, snapshotHash: 'sha256:verified', source: 'update',
    }));
    translationFind.mockReturnValue(query([{
      locale: 'fil-ph', title: 'Ano ang ipinapakita ng tala?', content: 'Sinuring salin.',
      sourceRevisionId: '507f1f77bcf86cd799439014', sourceRevisionNumber: 2,
    }]));
  });

  it('exports accepted public graph targets, provenance, revisions, and current translations', async () => {
    const bundle = await buildPublicEvidenceBundle({
      objectName: 'question', objectId: '507f1f77bcf86cd799439011', origin: 'https://example.test',
    });

    expect(bundle?.canonicalUrl).toBe('https://example.test/questions/entry/public-records/507f1f77bcf86cd799439011');
    expect(bundle?.relationships).toHaveLength(1);
    expect(bundle?.relationships[0]).toEqual(expect.objectContaining({
      relationship: 'evidence', citation: { page: '4' },
      target: expect.objectContaining({ title: 'Published audit', provenance: { originType: 'primary' } }),
    }));
    expect(bundle?.revision).toEqual(expect.objectContaining({ number: 2, snapshotHash: 'sha256:verified' }));
    expect(bundle?.translations).toEqual([expect.objectContaining({ locale: 'fil-ph' })]);
    expect(artifactFind).toHaveBeenCalledWith(expect.objectContaining({
      private: { $ne: true }, 'screening.status': 1,
    }));

    const jsonLd = evidenceBundleJsonLd(bundle!);
    expect(jsonLd).toEqual(expect.objectContaining({ '@type': 'CreativeWork', citation: [expect.any(Object)] }));
  });

  it('does not export a private or unaccepted source entry', async () => {
    questionFindOne.mockReturnValue(query(null));
    await expect(buildPublicEvidenceBundle({
      objectName: 'question', objectId: '507f1f77bcf86cd799439011', origin: 'https://example.test',
    })).resolves.toBeNull();
  });
});
