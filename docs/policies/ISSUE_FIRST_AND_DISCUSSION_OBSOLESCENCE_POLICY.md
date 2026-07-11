# Issue-First And Discussion Obsolescence Policy

## Purpose

Critical review findings must be resolved before discussion or factual review proceeds as though the affected entry were stable. Historical discussion remains visible and traceable to the revision it addressed.

## Blocking Gate

An issue blocks new discussion comments and final factual verdicts only when all of the following are true:

- its type is critical (`10`, `20`, `30`, `40`, or `45`);
- its screening status is accepted;
- its resolution status is neither `resolved` nor `dismissed`;
- it directly targets the entry receiving the comment or factual verdict.

Pending or rejected issues do not block. Ethical verdicts remain independent and are not blocked by a factual issue gate.

## Resolution And Overrides

- A reviewer or administrator may resolve or dismiss a blocking issue only with a reason of at least 10 characters.
- A resolution creates an entry revision and privileged audit event.
- An administrator may override a blocking gate only by supplying a reason of at least 10 characters.
- Every override creates a separate privileged audit event with the action and blocking-issue count.
- There is no silent, scheduled, or automatic expiry of unresolved content in this release.

## Revision-Linked Discussion

- A new comment records the current immutable revision of the entry it addresses.
- When a newer entry revision is created, older comments are marked `potentially_obsolete`; they are not hidden or deleted.
- A reviewer may mark a flagged comment `relevant` or `obsolete` with a reason.
- Comment relevance decisions create a new comment revision and privileged audit event.
- Obsolete comments remain readable as historical context.

## Initial Scope

The first gate covers new comments and final factual verdicts. Broader strict-debate controls, automatic archive windows, reputation weighting, and scorecards require separate governed pilots and are not inferred from this policy.
