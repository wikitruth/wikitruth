# Gap Checklist Plan (Post-Validation)

This plan turns the validated status docs into an execution checklist focused on `not_implemented` and high-risk `partial` items.

Status update (2026-04-18): migration-closure scope items are completed. Remaining unchecked items are post-migration roadmap work.

Status update (2026-07-12): controlled anonymous contribution and deterministic reputation/scorecards are implemented. Automatic unresolved-content expiry is explicitly deferred and must not be inferred from archived-status support.

Status update (2026-07-13): core governance reconciliation, content-policy assets, explicit archived/freshness UX, and the FixPH civic accountability workspace are implemented. Remaining pilot/seed items require real content operations and are not software implementation tasks.

## Track 1: Core Reliability and Moderation Correctness

- [x] Implement duplicate detection service for topic/argument/question create+edit paths (`CORE-002`).
- [x] Add duplicate resolution workflow (merge + redirect metadata + moderator action logs) (`CORE-002`, `CONTENT-004`).
- [x] Implement true CR domain model (`ChangeRequest`, states, target fragments) (`CORE-014`).
- [x] Add CR reviewer actions: accept/reject/partial accept with diff preview (`CORE-014`).
- [x] Add stale-CR conflict detection and explicit rebase/resolve flow (`CORE-015`).
- [x] Add revision history model (entry-level + block-level snapshots) (`CORE-016`).
- [x] Add reviewer-approved rollback endpoint + UI (`CORE-016`).
- [x] Add suggestion-only mode for restricted entries (`CORE-017`).
- [x] Add immutable privileged action audit event store (`CORE-034`).
- [x] Emit hash-chained audit events for moderation/verdict/role changes (`CORE-034`).

## Track 2: Verdict and Issue Governance

- [x] Add controlled anonymous proposal intake with quotas, privacy-preserving risk checks, reviewer queue, and no automatic publication (`CORE-019`).
- [x] Implement reviewer vote records for verdicts (`CORE-021`).
- [x] Implement threshold consensus policy (default 2/3) with configurable settings (`CORE-021`).
- [x] Add verdict provenance UI (who voted, when, rationale) (`CORE-021`).
- [x] Add explicit truth-channel vs ethics-channel verdict structures (`CORE-022`, `CONTENT-005`).
- [x] Add reader signal model (`controversial`, `incorrect verdict`, `needs reevaluation`, `wrong category`) (`CORE-023`).
- [x] Route reader signals into moderation triage queue without auto-mutation (`CORE-023`).
- [x] Build verdict/issue appeal workflow with responsible reviewer assignment (`CORE-024`).
- [x] Enforce issue-first discussion gate for unresolved critical issues (`CORE-026`).
- [ ] Add unresolved-content expiry job + override mechanics (`CORE-025`) - explicitly deferred by product decision on 2026-07-12.

## Track 3: Security, Ops, and Deploy Stability

- [x] Fix production runtime blocker for PM2/node dynamic library path compatibility (`CORE-031`).
- [x] Add deployment matrix validation for supported Node runtime versions (`CORE-031`).
- [x] Implement restore action in modern admin backup API (`CORE-030`).
- [x] Create and test restore runbook in staging (`CORE-030`).
- [x] Expand XSS/security test coverage for sanitizer policy (`CORE-032`).
- [x] Add end-to-end OAuth/session callback tests for enabled providers (`CORE-033`).

## Track 4: Workflow UX and Engagement

- [x] Build inline create/edit/reply experience for core entry pages (`FLOW-001`).
- [x] Build unified create wizard from navbar with context targeting (`FLOW-002`).
- [x] Finish modern clipboard parity: batch copy/move/link + conflict handling (`FLOW-003`).
- [x] Implement actual entry-type conversion workflow (not verdict relabeling) (`FLOW-004`).
- [x] Add comment classification model and UI routing (`FLOW-009`).
- [x] Add thread quality controls (spam cadence, duplicate/repeat protection, max depth/length) (`FLOW-012`).
- [x] Add Home ranking buckets (`Latest`, `Trending`, `Top`) with documented formulas (`FLOW-013`).
- [x] Expand Explore filters (status/tag/relationship/screening) + sharable URL state (`FLOW-014`).
- [x] Wire real reactions (`Upvote/Downvote`, `Expose/Bury`, etc.) decoupled from verdict (`FLOW-019`).
- [x] Add reputation model and ranking inputs (`FLOW-021`).
- [x] Add deterministic badge/scorecard system (`FLOW-022`).
- [x] Build unified entry timeline and timeline visualization mode (`FLOW-023`, `FLOW-028`).
- [x] Implement backend follow/subscribe with delivery triggers (`FLOW-024`).
- [x] Implement notification center + unread counts + deep links (`FLOW-025`).

## Track 5: Content Ops and Policy Assets

- [x] Publish contributor/reviewer policy docs and versioning process (`CONTENT-001`).
- [x] Publish issue taxonomy handbook with moderation examples (`CONTENT-002`).
- [x] Publish verdict policy handbook aligned with UI labels (`CONTENT-003`).
- [x] Publish duplicate/merge policy (`CONTENT-004`).
- [x] Publish source quality rubric and reviewer checklist (`CONTENT-006`).
- [x] Publish screening playbook with SLA targets (`CONTENT-013`).
- [x] Publish reviewer playbook with escalation/appeal paths (`CONTENT-014`).
- [x] Publish stale-discussion cleanup SOP (`CONTENT-015`).
- [x] Publish concise-writing standard and enforcement checklist (`CONTENT-016`).
- [x] Define incentives model and quality-linked attribution metrics (`CONTENT-017`).

## Track 6: FixPH Productization

- [x] Extend FixPH IA with explicit `Actions`, `Vote Wisely`, and `History` sections (`FIXPH-001`).
- [x] Implement government hierarchy entity model and responsibility graph (`FIXPH-002`).
- [x] Add project accountability schema + project detail dashboards (`FIXPH-003`).
- [x] Implement citizen observation submission + escalation lifecycle (`FIXPH-004`).
- [x] Add location model and geo-surfacing endpoints/UI (`FIXPH-005`).
- [x] Build Vote Wisely candidate comparison workspace (`FIXPH-006`).
- [x] Add incident stage model and severity progression (`FIXPH-007`).
- [x] Add long-term historical memory linking incidents to follow-up actions (`FIXPH-008`).

## Track 7: Migration Closure Gate (Admin + UX)

- [x] Execute Track A (admin parity) from `docs/plans/completed/MIGRATION_CLOSURE_PENDING_CHECKLIST_PLAN_2026-04-18.md`.
- [x] Execute Track B (core UX closure) from `docs/plans/completed/MIGRATION_CLOSURE_PENDING_CHECKLIST_PLAN_2026-04-18.md`.
- [x] Execute Track C (runtime/security/auth hardening) from `docs/plans/completed/MIGRATION_CLOSURE_PENDING_CHECKLIST_PLAN_2026-04-18.md`.
- [x] Complete Track D verification/sign-off in `docs/plans/completed/MIGRATION_CLOSURE_PENDING_CHECKLIST_PLAN_2026-04-18.md` before marking migration as fully complete.

## Pilot and Validation Exit Criteria

- [ ] Run controlled 2-person custom debate pilot and publish findings (`CONTENT-018`) - deferred with broad strict-debate rollout.
- [ ] Run controversial-topic reviewer calibration stress test (`CONTENT-019`).
- [ ] Ship one flagship Wikitruth topic + one flagship FixPH issue cluster under full end-to-end flow (`CONTENT-020`).
- [x] Update validated checklist docs with new statuses after each completed track.
