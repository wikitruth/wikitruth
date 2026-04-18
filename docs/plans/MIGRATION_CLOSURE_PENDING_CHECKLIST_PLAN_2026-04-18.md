# Migration Closure Pending Checklist Plan (2026-04-18)

Purpose: close remaining gaps before declaring legacy code fully modernized and migrated across product workflows, admin operations, and UX.

References:
- `docs/plans/plan-2026-04-14/06_VALIDATED_CHECKLIST_CORE_PLATFORM.md`
- `docs/plans/plan-2026-04-14/07_VALIDATED_CHECKLIST_PRODUCT_WORKFLOWS.md`
- `docs/plans/plan-2026-04-14/08_VALIDATED_CHECKLIST_CONTENT_FIXPH.md`
- `docs/plans/plan-2026-04-14/09_GAP_CHECKLIST_PLAN.md`

## Exit Criteria

- [ ] No critical migration blocker remains in admin/security/runtime tracks.
- [ ] Admin modern routes are feature-parity complete for all required operations.
- [ ] Core UX parity gaps (authoring, notifications, timeline, filtering/ranking) are implemented and verified.
- [ ] Validated status docs (`06`, `07`, `08`) are updated to reflect completed state.

## Track A — Admin Feature Parity and Operations UX

- [x] Implement modern restore workflow end-to-end (API + UI + permission checks + operator confirmations) (`CORE-030`).
- [x] Add restore runbook validation and rollback drill evidence for staging (`CORE-030`).
- [x] Implement immutable privileged-action audit timeline and admin viewer (moderation, verdict, role, ownership) (`CORE-034`).
- [x] Add reviewer-vote governance UI in admin/moderation (votes, threshold state, provenance details) (`CORE-021`).
- [x] Add reader-signal triage and appeal queue views in admin/moderation dashboards (`CORE-023`, `CORE-024`, `FLOW-026`).
- [x] Add parity QA checklist for all modern admin routes and high-risk mutations (users/accounts/admins/groups/categories/statuses/verdicts/backup) (`FLOW-034`).
- [x] Add admin UX refinements for bulk operations, filters, confirms, and failure recovery paths (`FLOW-032`, `FLOW-035`).

## Track B — Core UI/UX Migration Closure

- [x] Implement inline create/edit/reply flows for core entry pages (`FLOW-001`).
- [x] Implement unified create wizard from navbar with context-aware targeting (`FLOW-002`).
- [x] Complete clipboard move/copy/link parity with conflict handling and permission messaging (`FLOW-003`).
- [x] Implement true entry-type conversion workflow preserving semantics/history (`FLOW-004`, `CORE-016`).
- [x] Implement notification center + unread counts + deep links with backend subscriptions (`FLOW-024`, `FLOW-025`).
- [x] Implement unified timeline/history UX and timeline visualization mode (`FLOW-023`, `FLOW-028`).
- [x] Implement Home ranking buckets (`Latest`, `Trending`, `Top`) and advanced Explore filters with URL-shareable state (`FLOW-013`, `FLOW-014`).
- [x] Implement comment classification and discussion quality controls (`FLOW-009`, `FLOW-012`).
- [x] Complete mobile-first navigation parity and responsive UX consistency across key pages (`FLOW-031`).

## Track C — Runtime Stability, Security, and Auth Hardening

- [x] Resolve production runtime compatibility blockers and validate PM2 restart reliability (`CORE-031`).
- [x] Add deployment/runtime compatibility matrix checks to CI (`CORE-031`).
- [x] Expand sanitizer/XSS regression coverage for rich content flows (`CORE-032`).
- [x] Add end-to-end OAuth/session callback tests for enabled social providers (`CORE-033`).

## Track D — Verification and Sign-Off

- [ ] Run end-to-end parity walkthrough for modern vs legacy on home, entry, admin, moderation, and auth flows.
- [ ] Produce sign-off checklist artifact with pass/fail notes and linked evidence (tests/screenshots/logs).
- [ ] Re-run validated checklist pass and update statuses in:
  - [ ] `docs/plans/plan-2026-04-14/06_VALIDATED_CHECKLIST_CORE_PLATFORM.md`
  - [ ] `docs/plans/plan-2026-04-14/07_VALIDATED_CHECKLIST_PRODUCT_WORKFLOWS.md`
  - [ ] `docs/plans/plan-2026-04-14/08_VALIDATED_CHECKLIST_CONTENT_FIXPH.md`
- [ ] Move this plan to `docs/plans/completed/` only after all checklist items are complete and verification is successful.
