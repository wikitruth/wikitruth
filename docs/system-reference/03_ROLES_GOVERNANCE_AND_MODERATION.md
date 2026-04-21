# Roles, Governance, and Moderation

## Role Model (Normalized)

1. `Anonymous`
- Read-only baseline; optional limited posting in controlled modes.

2. `Reader`
- Can browse, react, and submit non-authoritative signals.

3. `Contributor`
- Can create and suggest edits under screening rules.

4. `Screener`
- Performs initial quality triage and screening decisions.

5. `Reviewer`
- Performs higher-trust review, issue adjudication, and verdict decisions.

6. `Admin`
- Handles system-level operations, role management, policy and recovery workflows.

## Governance Principles

- Moderator/reviewer power should be constrained by traceability.
- Role elevation and demotion should be auditable.
- Reviewer actions should favor evidence-backed outcomes over popularity alone.
- Public trust depends on transparent moderation standards.

## Moderation Stages

1. Submission
- New contribution enters pending state.

2. Screening
- Baseline quality checks (clarity, relevance, no obvious abuse).

3. Review
- Deeper logic/evidence/issue evaluation.

4. Verdict
- Status assignment based on review outcomes and unresolved issues.

5. Appeal
- Contested moderation/verdict actions can be challenged and re-reviewed.

## Issue Engine (Normalized)

Issue types captured across source docs:

- logical fallacy
- terminology/definition mismatch
- unsupported assertion
- ambiguity or confusing structure
- moral-vs-factual category mismatch

Issue severity behavior:

- `warning`: visible concern, non-blocking
- `critical`: discussion or progression gate until resolved

## Review and Voting Concepts

Common source pattern:

- reviewer votes should drive verdict confidence
- thresholds may be stricter for controversial topics
- low-risk/general facts may use lighter thresholds

Normalized recommendation:

- verdict requires explicit vote provenance
- preserve dissent records
- separate popularity reactions from verdict authority

## Reader Signal Channel

Reader voice suggestions in source notes imply non-mutating triage input types:

- controversial topic flag
- incorrect verdict report
- reevaluation request
- wrong category
- wrong parent/link

These signals should feed moderation queues without directly changing verdict status.

## Policy Risk Notes

Some source material includes highly charged political framing and broad normative claims.

Policy for integration:

- treat these as hypothesis/claim inputs,
- require source-backed evidence and issue review,
- avoid publishing unverified allegations as validated conclusions.

