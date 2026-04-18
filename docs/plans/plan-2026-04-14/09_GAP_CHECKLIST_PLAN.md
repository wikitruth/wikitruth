# Gap Checklist Plan (Post-Validation)

This plan turns the validated status docs into an execution checklist focused on `not_implemented` and high-risk `partial` items.

Status update (2026-04-18): migration-closure scope items are completed. Remaining unchecked items are post-migration roadmap work.

## Track 1: Core Reliability and Moderation Correctness

- [ ] Implement duplicate detection service for topic/argument/question create+edit paths (`CORE-002`).
- [ ] Add duplicate resolution workflow (merge + redirect metadata + moderator action logs) (`CORE-002`, `CONTENT-004`).
- [ ] Implement true CR domain model (`ChangeRequest`, states, target fragments) (`CORE-014`).
- [ ] Add CR reviewer actions: accept/reject/partial accept with diff preview (`CORE-014`).
- [ ] Add stale-CR conflict detection and explicit rebase/resolve flow (`CORE-015`).
- [ ] Add revision history model (entry-level + block-level snapshots) (`CORE-016`).
- [ ] Add reviewer-approved rollback endpoint + UI (`CORE-016`).
- [ ] Add suggestion-only mode for restricted entries (`CORE-017`).
- [x] Add immutable privileged action audit event store (`CORE-034`).
- [ ] Emit signed audit events for moderation/verdict/role changes (`CORE-034`).

## Track 2: Verdict and Issue Governance

- [x] Implement reviewer vote records for verdicts (`CORE-021`).
- [x] Implement threshold consensus policy (default 2/3) with configurable settings (`CORE-021`).
- [x] Add verdict provenance UI (who voted, when, rationale) (`CORE-021`).
- [ ] Add explicit truth-channel vs ethics-channel verdict structures (`CORE-022`, `CONTENT-005`).
- [x] Add reader signal model (`controversial`, `incorrect verdict`, `needs reevaluation`, `wrong category`) (`CORE-023`).
- [x] Route reader signals into moderation triage queue without auto-mutation (`CORE-023`).
- [x] Build verdict/issue appeal workflow with responsible reviewer assignment (`CORE-024`).
- [ ] Enforce issue-first discussion gate for unresolved critical issues (`CORE-026`).
- [ ] Add unresolved-content expiry job + override mechanics (`CORE-025`).

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
- [ ] Add reputation model and ranking inputs (`FLOW-021`).
- [ ] Add deterministic badge/scorecard system (`FLOW-022`).
- [x] Build unified entry timeline and timeline visualization mode (`FLOW-023`, `FLOW-028`).
- [x] Implement backend follow/subscribe with delivery triggers (`FLOW-024`).
- [x] Implement notification center + unread counts + deep links (`FLOW-025`).

## Track 5: Content Ops and Policy Assets

- [ ] Publish contributor/reviewer policy docs and versioning process (`CONTENT-001`).
- [ ] Publish issue taxonomy handbook with moderation examples (`CONTENT-002`).
- [ ] Publish verdict policy handbook aligned with UI labels (`CONTENT-003`).
- [ ] Publish duplicate/merge policy (`CONTENT-004`).
- [ ] Publish source quality rubric and reviewer checklist (`CONTENT-006`).
- [ ] Publish screening playbook with SLA targets (`CONTENT-013`).
- [ ] Publish reviewer playbook with escalation/appeal paths (`CONTENT-014`).
- [ ] Publish stale-discussion cleanup SOP (`CONTENT-015`).
- [ ] Publish concise-writing standard and enforcement checklist (`CONTENT-016`).
- [ ] Define incentives model and quality-linked attribution metrics (`CONTENT-017`).

## Track 6: FixPH Productization

- [ ] Extend FixPH IA with explicit `Actions`, `Vote Wisely`, and `History` sections (`FIXPH-001`).
- [ ] Implement government hierarchy entity model and responsibility graph (`FIXPH-002`).
- [ ] Add project accountability schema + project detail dashboards (`FIXPH-003`).
- [ ] Implement citizen observation submission + escalation lifecycle (`FIXPH-004`).
- [ ] Add location model and geo-surfacing endpoints/UI (`FIXPH-005`).
- [ ] Build Vote Wisely candidate comparison workspace (`FIXPH-006`).
- [ ] Add incident stage model and severity progression (`FIXPH-007`).
- [ ] Add long-term historical memory linking incidents to follow-up actions (`FIXPH-008`).

## Track 7: Migration Closure Gate (Admin + UX)

- [x] Execute Track A (admin parity) from `docs/plans/completed/MIGRATION_CLOSURE_PENDING_CHECKLIST_PLAN_2026-04-18.md`.
- [x] Execute Track B (core UX closure) from `docs/plans/completed/MIGRATION_CLOSURE_PENDING_CHECKLIST_PLAN_2026-04-18.md`.
- [x] Execute Track C (runtime/security/auth hardening) from `docs/plans/completed/MIGRATION_CLOSURE_PENDING_CHECKLIST_PLAN_2026-04-18.md`.
- [x] Complete Track D verification/sign-off in `docs/plans/completed/MIGRATION_CLOSURE_PENDING_CHECKLIST_PLAN_2026-04-18.md` before marking migration as fully complete.

## Pilot and Validation Exit Criteria

- [ ] Run controlled 2-person custom debate pilot and publish findings (`CONTENT-018`).
- [ ] Run controversial-topic reviewer calibration stress test (`CONTENT-019`).
- [ ] Ship one flagship Wikitruth topic + one flagship FixPH issue cluster under full end-to-end flow (`CONTENT-020`).
- [x] Update validated checklist docs with new statuses after each completed track.
