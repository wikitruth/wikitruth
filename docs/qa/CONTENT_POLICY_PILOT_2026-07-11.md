# Content Policy Pilot Evidence (2026-07-11)

## Result

The content-operations policy pack was exercised against the live Wikitruth database in read-only mode. The run completed without mutating entries, users, revisions, verdicts, issues, or artifacts.

Command:

```bash
npm run test:policy:pilot
```

Machine-readable evidence:

- `docs/qa/artifacts/content-policy-pilot-2026-07-11/manifest.json`

## Coverage

- Inspected up to 100 public records from each of the seven entry families.
- Inspected public totals: 61 topics, 56 arguments, 21 questions, 3 artifacts, 23 issues, 24 opinions, and 5 answers.
- Retained a five-record sample per family where available, for 33 sampled records total.
- Evaluated scoped exact-title duplicate candidates, revision coverage, artifact provenance and source-quality adoption, independent verdict-channel adoption, and unresolved accepted critical issues.

## Findings

- No same-scope exact-title duplicate candidate groups were found in the inspected sample.
- None of the 33 sampled legacy records currently has a persisted immutable revision. Revisions are created lazily when history is requested or when a modern write occurs.
- None of the 3 existing artifacts has persisted richer provenance or a source-quality review.
- Existing topics, arguments, and answers have not yet persisted independent factual/ethical verdict channels; legacy verdicts remain readable through the compatibility mapping.
- Five accepted critical issues remain unresolved and will block new comments or final factual verdicts on their direct targets until reviewed.

## Decision

The pilot execution requirement is complete. The adoption gaps are expected for unchanged legacy records and do not indicate a failed implementation. They form an operational review queue:

1. Review and resolve or dismiss the five accepted critical issues with reasons.
2. Add provenance and source-quality reviews when each existing artifact is next handled.
3. Use the dual-channel reviewer UI for future verdict decisions; legacy verdicts remain factual-channel compatibility input.
4. Allow revision snapshots to bootstrap lazily to avoid a risky bulk mutation of historical content.

Automatic expiry, silent merge, and bulk historical rewriting remain prohibited by policy.
