# Epistemic Flagship Pilot

Date: 2026-07-18

## Result

The disposable local pilot passed the complete governed decision workflow. It
used five temporary accountable identities: one selected administrator, three
independent reviewers, and one reader. No production or remote system was
contacted.

| Check | Evidence |
| --- | --- |
| Factual consensus | 3 of 3 eligible votes, `supported`, 90 average confidence |
| Ethical consensus | 3 of 3 eligible votes, `permissible`, 90 average confidence |
| Evidence | 2 artifacts, 2 provenance records, 2 completed quality reviews, 2 evidence references per vote |
| Issue-first gate | 1 accepted critical issue resolved before factual publication; 0 unresolved at completion |
| Administrator final say | Explicit override to `refuted`, followed by an explicit reversal to `supported` |
| History | 4 immutable claim revisions covering both consensus decisions and both administrator decisions |
| Public challenge | Reader signal and verdict appeal created through standard APIs |
| Civic reuse | FixPH tenant record linked to a Wikitruth artifact as `evidence` |
| Audit integrity | Valid before and after; chain advanced from 59 to 67 verified events |
| Cleanup | 0 records remained across all 19 mutable fixture categories; no credentials retained |

The final factual result intentionally retains `decisionMode=admin_override` so
consumers can see that an administrator made the most recent final decision,
even though it restored the same status previously reached by consensus. The
ethical result retains `decisionMode=consensus`.

## Reproduce

```bash
npm run test:epistemic:pilot
```

The runner defaults to `https://127.0.0.1:9443` and the configured loopback
MongoDB. It refuses public web hosts, remote MongoDB hosts, and `mongodb+srv`
targets. A different loopback URL may be supplied through
`WT_EPISTEMIC_BASE_URL`.

Machine-readable evidence is in
`docs/qa/EPISTEMIC_FLAGSHIP_PILOT_REPORT_2026-07-18.json`. The report is replaced
on each run. Immutable entry/audit events remain by design; all mutable content,
identities, sessions, memberships, revisions, feedback, links, and credentials
are removed.

## Honest Boundary

This proves system behavior, not social adoption or the truth of synthetic test
content. Real operation still requires evidence sourced from the world and
independent subject-matter reviewers who have accepted the published review
responsibilities.
