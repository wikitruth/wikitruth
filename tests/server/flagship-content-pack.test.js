'use strict';

const fs = require('fs');
const path = require('path');

const packPath = path.join(process.cwd(), 'content/flagships/2026-08-first-real-world-pilots.json');
const scriptPath = path.join(process.cwd(), 'scripts/content/flagship-pilots.mjs');

describe('real-world flagship content pack', () => {
  const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));

  it('is review-first and cannot represent seeded consensus', () => {
    expect(pack.publicationMode).toBe('pending-review');
    expect(pack.reviewPolicy).toEqual(expect.objectContaining({
      neverSeedVerdicts: true,
      neverSeedReviewerVotes: true,
      minimumIndependentReviewers: 3,
      translationStatus: 'pending',
    }));
    expect(JSON.stringify(pack)).not.toMatch(/"decisionMode"\s*:\s*"(?:consensus|admin_override)"/);
  });

  it('contains a bounded Wikitruth claim, primary evidence, qualification, and Filipino variants', () => {
    expect(pack.wikitruth.claims).toHaveLength(2);
    expect(pack.wikitruth.artifacts.length).toBeGreaterThanOrEqual(3);
    expect(pack.wikitruth.openIssue.issueType).toBe(30);
    expect(pack.wikitruth.reviewCalibration.requiredChecks.length).toBeGreaterThanOrEqual(4);
    expect(pack.wikitruth.reviewCalibration.appealTriggers.length).toBeGreaterThanOrEqual(3);
    expect(pack.wikitruth.topic.translations).toEqual(expect.arrayContaining([
      expect.objectContaining({ locale: 'fil' }),
    ]));
    pack.wikitruth.artifacts.forEach((artifact) => expect(artifact.source).toMatch(/^https:\/\//));
  });

  it('contains a linked FixPH responsibility and verification cluster without claiming target achievement', () => {
    const kinds = new Set(pack.fixph.records.map((record) => record.kind));
    expect([...kinds]).toEqual(expect.arrayContaining(['institution', 'project', 'observation', 'action', 'history']));
    expect(pack.fixph.records.find((record) => record.key === 'epr-2025-recovery-target').description)
      .toMatch(/not a claim that the target was achieved/i);
    expect(pack.fixph.reviewCalibration.requiredChecks.join(' ')).toMatch(/statutory targets.*verified accomplishments/i);
    pack.fixph.artifacts.forEach((artifact) => expect(artifact.source).toMatch(/^https:\/\//));
  });

  it('uses unique deterministic keys and slugs across both pilots', () => {
    const entries = [
      pack.wikitruth.topic, ...pack.wikitruth.claims, ...pack.wikitruth.artifacts,
      pack.wikitruth.openIssue, ...pack.fixph.records, ...pack.fixph.artifacts,
    ];
    expect(new Set(entries.map((entry) => entry.key)).size).toBe(entries.length);
    expect(new Set(entries.map((entry) => entry.friendlyUrl)).size).toBe(entries.length);
  });

  it('keeps publication dry-run-first and fail-closed for database targeting', () => {
    const source = fs.readFileSync(scriptPath, 'utf8');
    expect(source).toContain("const apply = process.argv.includes('--apply')");
    expect(source).toContain('--expected-database');
    expect(source).toContain('WT_FLAGSHIP_CREATOR_USERNAME');
    expect(source).toContain('publish-pending-flagship-pilots');
    expect(source).toContain("reviewState: 'pending-review'");
    expect(source).toContain('seededVerdicts: 0');
    expect(source).toContain('seededReviewerVotes: 0');
  });
});
