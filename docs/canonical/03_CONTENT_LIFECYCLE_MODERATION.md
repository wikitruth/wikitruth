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
- Reader-facing page filters label states as `Accepted`, `Pending`, `Archived`, and `All states` while retaining legacy API values (`wiki`, `original`, `archived`, `all`). The application-wide `Accepted + pending` preference uses `view=active`.
- Archived entries remain available for historical context and are not presented as current accepted content.
- A valid reference date identifies time-sensitive information and prompts readers to check newer evidence; it does not trigger automatic expiry.

## Verdict Lifecycle

- Factual and ethical verdict channels apply to `Topic`, `Argument`, and `Answer`.
- Reviewers submit independent factual or ethical votes with reasoning, evidence, confidence, expertise, conflict declaration, and policy version.
- A versioned quorum and supermajority policy determines channel consensus.
- Reaching valid consensus may publish the final channel decision after applicable issue-first gates pass.
- Administrators may make a reasoned final-say override; overrides are explicit, visible, revisioned, and tamper-evident.
- Verdict-channel updates and reviewer votes require reviewer/admin privileges and completed reviewer onboarding where applicable.
- Final factual verdicts are blocked by accepted critical issues unless the issue is resolved or an audited administrator override is supplied.
- Verdict queue supports:
- filtered listing
- single update
- bulk update
- reviewer votes and deterministic consensus summaries

## Moderation Operations

- Retrieve moderation target and status metadata.
- Update screening.
- Update verdict (with optional reasoning).
- Review reader signals and accepted-critical issues.
- Create and resolve field-level change requests with stale-base detection.
- Inspect immutable revision history and perform reviewer-approved rollback.
- Review duplicate candidates and perform audited merges with durable redirects.
- Take ownership.
- Delete entry.
- Ownership migration for root topics between public and journal scope with guardrails.

## Data Integrity Behavior

- Parent/owner child counters are recomputed on moderation state changes and deletions.
- Batch counter updates support transactional mode.
- Guardrails assert `childrenCount` consistency (`total == accepted + pending + rejected` per bucket).
- Archived child counts are stored in a separate `archived` bucket so the
  legacy `total` invariant remains backward compatible while reader visibility
  counts can include retained historical content.
- Privileged moderation, verdict, role, merge, and revision actions append tamper-evident hash-chained events.

## Lifecycle Invariant

Moderation state is operationally meaningful, not cosmetic: it directly controls what appears in wiki/public flows and is coupled to aggregate child counts and discovery surfaces.

## Agent Governance

- Agent-created core entries begin pending and use the normal screening flow.
- Agent edits to accepted content create stale-safe Change Requests and do not
  mutate the accepted entry before human review.
- Agent verdict analysis is advisory, separately attributed, and excluded from
  consensus. A human reviewer may countersign it into a distinct eligible vote;
  an agent can never overwrite a human vote or directly trigger publication.
- Screening, final verdict publication, administrator override, deletion,
  merge, rollback, ownership changes, and Change Request resolution are
  human-only operations.
