# Legacy vs Modern Feature Completeness Audit Plan (2026-07-11)

## Goal

Re-open legacy-to-modern parity at feature and workflow depth, rather than treating matching routes or HTTP `200` responses as proof of completeness. This audit also distinguishes legacy replacement readiness from the larger modern target-state roadmap.

## Method

- Compared the same public artifact in legacy and modern at desktop and `390x844` mobile viewports.
- Inspected legacy templates/controllers and modern routes/pages/API controllers for public, authenticated, moderation, administration, application-specific, and recovery workflows.
- Rechecked the deferred target-state inventories against current `client/src`, `server/src`, and tests.
- Reviewed parity automation for false-positive and live-data mutation risks.
- Added focused regression tests for each low-risk issue corrected during this pass.

## Current Assessment

### Legacy replacement readiness

**Not yet complete.** Core public reading, entry CRUD, discussion, search, visualization, member/group, moderation, and admin surfaces are substantially represented in modern code. Replacement remains blocked by the fresh-install recovery gap and requires additional validation for authenticated/privileged workflows.

### Modern target-state completeness

**Not complete.** The modern application exceeds legacy in notifications, timeline, reaction persistence, reader signals/appeals, audit viewing, and the unified create flow. It still lacks several approved/deferred product capabilities, including duplicate/merge handling, change requests and revision rollback, strict debate modes, reputation, content-operations policy/playbooks, and most dedicated FixPH workflows.

## Feature Matrix

| Area | Legacy parity | Modern completeness | Evidence / decision |
| --- | --- | --- | --- |
| Global header and application sections | Corrected in this pass | Modern adds Create and account notification affordances | Modern previously omitted legacy Debates/Dictionary/Manuscripts and tenant sections even though `/api/home` returned them. |
| Responsive shell and context sidebar | Corrected in this pass; deployment verification pending | Modern retains a usable slide-out sidebar | Closed modern sidebar widened a 390 px document to 680 px; legacy removed the closed panel from layout. |
| Home / Explore / Search | Substantially present | Advanced Explore filters and keyboard navigation exceed legacy | FixPH/application feature-card URLs were normalized in this pass so client-side navigation does not 404. |
| Topic / argument / question / answer / issue / opinion / artifact entries | Substantially present | Modern adds signals, appeals, persisted reactions, and timeline | Public artifact comparison confirmed content/action depth; authenticated role behavior still needs a credentialed no-mutation run. |
| Comment terminology and URLs | Corrected in this pass | Opinion remains the canonical model | Added `/comment/*` and `/comments/*` compatibility paths to the modern opinion pages. |
| Members, profiles, journals, groups | Present in code and focused tests | Modern follow/subscription support exceeds legacy | Full role/session runtime journey remains an audit item. |
| Screening, verdicts, conversion, ownership | Present in modern API/UI | Signals, appeals, and bulk verdict operations exceed legacy | Requires credentialed screener/reviewer/admin runtime verification. |
| Admin CRUD and backup/restore | Present for authenticated admins | Audit timeline is modern-only | Normal admin restore is tested; empty-database bootstrap is not covered by this path. |
| Fresh install / empty database recovery | **Missing** | Incomplete operationally | `/api/home` redirects an empty database to `/install`, but modern `/install` only shows contributor setup instructions. Legacy `/install` performs guarded restore/bootstrap. |
| Dynamic application About pages | **Missing** | Incomplete multi-tenant content support | Legacy `/about/:id` loads a `Page` by stable `id`; modern has only a static `/about` route. |
| QA proof | Partial | Incomplete | Screenshot runner captures files but does not compare them. Auth runner was corrected to find the modern `more` menu and now requires explicit opt-in before generated signup. |
| Mobile/native client | Not a legacy-web parity requirement | Planned, not implemented | `REACT_NATIVE_MONOREPO_CHECKLIST_PLAN_2026-04-19.md` remains active with its implementation backlog. |

## Verified Defects Corrected in This Pass

- [x] Hide the closed off-canvas sidebar at mobile breakpoints so it cannot create horizontal overflow.
- [x] Restore legacy default header sections: Debates, Dictionary, and Manuscripts.
- [x] Render tenant/application sections in the modern header.
- [x] Normalize legacy-style application topic URLs in both Header and Home navigation.
- [x] Add modern comment list/create/entry aliases backed by the Opinion implementation.
- [x] Update the authenticated parity runner to locate the current modern `more` action menu.
- [x] Require explicit `WT_PARITY_ALLOW_SIGNUP=true` before parity QA creates a generated account.

## Open Legacy-Replacement Work

- [ ] Design and implement a secure one-time empty-database bootstrap/restore flow reached from `/install`.
- [ ] Add a modern public dynamic application page contract and `/about/:id` route, including not-found and visibility rules.
- [ ] Add semantic DOM/action inventory comparisons to parity QA; do not treat screenshots plus HTTP `200` as a parity assertion.
- [ ] Run credentialed reader/contributor/screener/reviewer/admin parity without creating persistent test users, and retain a redacted manifest.
- [ ] Expand live representative entry checks from the artifact sample to all seven entity families on desktop and mobile.

## Open Modern Target-State Work

The following remain genuinely pending after current-code searches. Detailed requirement IDs remain in `docs/plans/deferred/plan-2026-04-14/`.

- [ ] Duplicate detection, deterministic merge, redirects, and moderator logs (`CORE-002`, `CONTENT-004`).
- [ ] Change requests, stale-conflict handling, revision history, rollback, and suggestion mode (`CORE-014` through `CORE-017`).
- [ ] Contributor/reviewer onboarding gates and controlled anonymous contribution (`CORE-010`, `CORE-019`).
- [ ] Truth-versus-ethics verdict channels, unresolved-content expiry, and issue-first gates (`CORE-022`, `CORE-025`, `CORE-026`).
- [ ] Artifact subtype taxonomy and richer provenance (`CORE-027` through `CORE-029`).
- [ ] Strict debate modes, revision-linked comment obsolescence, reputation, and deterministic scorecards (`FLOW-007`, `FLOW-010`, `FLOW-021`, `FLOW-022`).
- [ ] Content policy packs, reviewer/screener playbooks, source-quality rubric, and seeded pilot evidence (`CONTENT-001` through `CONTENT-020`, as applicable).
- [ ] Dedicated FixPH information architecture, government/accountability/location models, Vote Wisely workspace, and incident lifecycle (`FIXPH-001` through `FIXPH-008`).
- [ ] React Native monorepo implementation and mobile release validation.

## Verification Checklist

- [x] Focused client tests for header sections, route aliases, and closed mobile sidebar behavior.
- [x] Focused server test for singular comment redirect behavior.
- [x] Server TypeScript no-emit check after the first correction set.
- [x] Full client and server test suites: 56 client suites / 139 tests and 33 server suites / 154 tests passed.
- [x] Production server and client builds.
- [x] PM2 process `35` (`wikitruth`) restart plus post-restart `200` checks for modern artifact, legacy artifact, and `/api/home`.
- [x] Live current-host verification of default header sections, comment redirect, and closed/open mobile overflow at `390x844`.
- [ ] Live tenant-host verification of FixPH/application-specific header and Home section navigation.

## Completion Rule

Keep this plan active until every item under **Open Legacy-Replacement Work** and **Verification Checklist** is complete. Modern target-state items may remain deferred only with an explicit product decision; they must not be represented as feature-complete.
