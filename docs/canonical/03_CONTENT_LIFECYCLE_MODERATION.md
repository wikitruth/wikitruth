# Canonical Card: Content Lifecycle, Screening, and Verdicts

## Purpose

Capture the canonical lifecycle of submitted content and moderation flow.

## Screening Lifecycle

- Screening statuses are canonical:
- `Pending` (0)
- `Accepted` (1)
- `Rejected` (2)
- `Archived` (3)
- New API content creation defaults to pending screening for moderated entities.
- Screening updates are performed through moderation APIs and are role-gated (screener/admin).

## Verdict Lifecycle

- Verdicts are applied to `Topic` and `Argument`.
- Verdict updates are admin-gated.
- Verdict queue supports:
- filtered listing
- single update
- bulk update

## Moderation Operations

- Retrieve moderation target and status metadata.
- Update screening.
- Update verdict (with optional reasoning).
- Take ownership.
- Delete entry.
- Ownership migration for root topics between public and journal scope with guardrails.

## Data Integrity Behavior

- Parent/owner child counters are recomputed on moderation state changes and deletions.
- Batch counter updates support transactional mode.
- Guardrails assert `childrenCount` consistency (`total == accepted + pending + rejected` per bucket).

## Lifecycle Invariant

Moderation state is operationally meaningful, not cosmetic: it directly controls what appears in wiki/public flows and is coupled to aggregate child counts and discovery surfaces.
