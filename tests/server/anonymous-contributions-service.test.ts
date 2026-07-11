import {
  anonymousAdoptionUrl,
  assessAnonymousRisk,
  contentFingerprint,
  hashAnonymousIdentity,
  hashReceipt,
  parseAnonymousContribution,
  receiptMatches,
} from '../../server/src/services/anonymousContributionsService';

const limits = {
  minimumFormAgeMs: 3000,
  maximumTitleLength: 180,
  maximumContentLength: 12000,
  maximumReferencesLength: 4000,
  maximumLinks: 2,
};

describe('anonymous contribution safeguards', () => {
  it('normalizes a supported proposal without retaining network identifiers', () => {
    const parsed = parseAnonymousContribution({
      entryType: 'Question',
      title: '  What evidence supports this claim?  ',
      content: '  This proposal asks for reproducible evidence and a source.  ',
      contactEmail: 'EDITOR@EXAMPLE.COM',
    }, limits);

    expect(parsed).toEqual({
      ok: true,
      value: expect.objectContaining({
        entryType: 'question',
        title: 'What evidence supports this claim?',
        contactEmail: 'editor@example.com',
      }),
    });
  });

  it('rejects unsupported or undersized proposals', () => {
    expect(parseAnonymousContribution({ entryType: 'unknown', title: 'Valid title', content: 'Long enough contribution content.' }, limits)).toEqual({
      ok: false,
      message: 'Choose a supported contribution type.',
    });
    expect(parseAnonymousContribution({ entryType: 'topic', title: 'Bad', content: 'Too short' }, limits).ok).toBe(false);
  });

  it('flags deterministic risk signals without rejecting editorial content', () => {
    const parsed = parseAnonymousContribution({
      entryType: 'artifact',
      title: 'Evidence submission',
      content: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA http://one.test http://two.test http://three.test',
    }, limits);
    if (!parsed.ok) throw new Error(parsed.message);

    expect(assessAnonymousRisk(parsed.value, limits)).toEqual({
      score: 75,
      flags: expect.arrayContaining(['excessive_links', 'repeated_characters', 'artifact_without_reference']),
    });
  });

  it('uses stable HMAC identifiers and timing-safe receipt comparison', () => {
    const first = hashAnonymousIdentity('secret', '127.0.0.1', 'browser');
    expect(first).toHaveLength(64);
    expect(first).toBe(hashAnonymousIdentity('secret', '127.0.0.1', 'browser'));
    expect(first).not.toBe(hashAnonymousIdentity('secret', '127.0.0.2', 'browser'));

    const expected = hashReceipt('secret', 'receipt');
    expect(receiptMatches(expected, hashReceipt('secret', 'receipt'))).toBe(true);
    expect(receiptMatches(expected, hashReceipt('secret', 'different'))).toBe(false);
  });

  it('deduplicates normalized proposal content and maps every editor route', () => {
    const parsed = parseAnonymousContribution({
      entryType: 'opinion',
      title: 'A useful comment',
      content: 'A sufficiently detailed comment for the discussion.',
    }, limits);
    if (!parsed.ok) throw new Error(parsed.message);
    expect(contentFingerprint('secret', parsed.value)).toBe(contentFingerprint('secret', {
      ...parsed.value,
      title: ' A   useful COMMENT ',
    }));
    expect(anonymousAdoptionUrl('opinion', 'abc')).toBe('/opinions/create?anonymousSubmission=abc');
    expect(anonymousAdoptionUrl('artifact', 'abc')).toBe('/artifacts/create?anonymousSubmission=abc');
  });
});
