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

**Functionally complete for public and recovery workflows; final signoff pending.** Core public reading, entry CRUD, discussion, search, visualization, member/group, moderation, admin, empty-database recovery, and dynamic About content are represented in modern code. Final replacement signoff still requires credentialed privileged-role validation and an externally reachable FixPH tenant check.

### Modern target-state completeness

**Not complete.** The modern application exceeds legacy in notifications, timeline, reaction persistence, reader signals/appeals, audit viewing, and the unified create flow. It still lacks several approved/deferred product capabilities, including duplicate/merge handling, change requests and revision rollback, strict debate modes, reputation, content-operations policy/playbooks, and most dedicated FixPH workflows.

## Recommendation Review (2026-07-11)

The unchecked work is valid, but it should not be executed as one undifferentiated modernization wave. The recommended order below protects data integrity first and defers features whose behavior depends on policy, operational capacity, or a stable API contract.

| Priority | Pending work | Validation | Recommendation |
| --- | --- | --- | --- |
| 1 | Dependency and deprecation remediation | Valid and urgent; the current audit baseline is documented in the active dependency plan | Complete the safe patch/minor security wave, replace the vulnerable backup package, then remove deprecated auth/template dependencies in isolated migrations. |
| 1 | Content policy baseline | Valid prerequisite, not optional paperwork | Define duplicate/merge rules, source-quality rubric, screener/reviewer playbooks, and truth-versus-ethics rules before automating governance decisions. |
| 1 | Duplicate detection and merge | Valid; current protection is limited to exact duplicate opinions | Implement deterministic candidate detection, moderator-approved merge, durable redirects, and a merge audit record. |
| 1 | Revision and change-request workflow | Valid; current entry events are activity records, not immutable content revisions | Add revision snapshots and diffs first, then rollback, stale-conflict detection, change-request states, and suggestion UI. |
| 1 | Tamper-evident privileged audit trail | Valid canonical requirement omitted from the original open-item summary | Add an append-only hash chain and verification tooling. Add public-key signing only if the threat model requires independently verifiable exports. |
| 2 | Artifact subtype and provenance | Valid and high-value evidence-quality work | Add a dedicated artifact taxonomy and backward-compatible provenance fields, then migrate UI and existing records incrementally. |
| 2 | Truth-versus-ethics verdict channels | Valid domain-model gap | Implement after the governing rubric and schema migration are approved. Keep truth and ethics outcomes independently queryable. |
| 2 | Contributor/reviewer onboarding | Valid, but depends on policy content | Implement role-specific gates after the playbooks and source-quality rubric exist. |
| 3 | Comment obsolescence | Valid, but technically blocked by revisions | Implement after revision identity and supersession semantics exist. |
| 3 | Issue-first gates and unresolved-content expiry | Valid concepts, but unsafe without thresholds and overrides | Define policy, escalation, exceptions, and administrator override behavior before implementation. Do not silently expire or mutate content. |
| Defer | Controlled anonymous contribution | Technically valid but materially expands abuse and moderation risk | Defer until abuse controls, reputation signals, moderation capacity, and operating policy are proven. It is not required for legacy replacement. |
| Defer | Strict debate, reputation, and scorecards | Valid target-state ideas with anti-gaming and policy dependencies | Pilot strict debate only after explicit rules exist. Defer reputation and scorecards until sufficient usage data supports deterministic, auditable scoring. |
| Separate program | FixPH productization | Valid extension roadmap; current implementation is tenant shell/configuration, not the full accountability product | Stabilize the core governance/data model and external tenant first, then execute FixPH information architecture and domain models as a separately scoped program. |
| Separate program | React Native client | Valid roadmap; bearer-token APIs exist but no mobile workspace is implemented | Start shared contracts and transport only after the security wave and core API schemas stabilize. Defer full native UI until web workflows are stable. |
| Verification | Credentialed role parity and external FixPH tenant | Valid release-signoff checks, not missing product implementation | Run with dedicated disposable/staging accounts; repair external DNS/proxy/firewall reachability before claiming FixPH tenant signoff. |

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
| Fresh install / empty database recovery | Implemented and tested | Secure one-time bootstrap plus normal admin restore | `/api/install` now requires an empty core database, server-side token, CSRF, `RESTORE`, backup preflight, rate limit, and post-restore checks. Initialized systems direct admins to `/admin/db-backup`. |
| Dynamic application About pages | Implemented and live-verified | About hierarchy is public without exposing profile pages | `/about/:id` uses `/api/pages/about/:id`, limits results to the About root/children, sanitizes HTML, and serves direct nested routes from the React shell. |
| QA proof | Public semantic coverage complete; privileged coverage pending | Improved | `migration-parity-semantic.mjs` validates all seven entry families, required semantics, HTTP state, error markers, and mobile overflow. Auth runner requires explicit opt-in before generated signup. |
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

- [x] Design and implement a secure one-time empty-database bootstrap/restore flow reached from `/install`.
- [x] Add a modern public dynamic application page contract and `/about/:id` route, including not-found and visibility rules.
- [x] Add semantic DOM/action inventory comparisons to parity QA; do not treat screenshots plus HTTP `200` as a parity assertion.
- [ ] Run credentialed reader/contributor/screener/reviewer/admin parity without creating persistent test users, and retain a redacted manifest.
- [x] Expand live representative entry checks from the artifact sample to all seven entity families on desktop and mobile.

## Open Modern Target-State Work

The following remain genuinely pending after current-code searches. Detailed requirement IDs remain in `docs/plans/deferred/plan-2026-04-14/`.

- [ ] Duplicate detection, deterministic merge, redirects, and moderator logs (`CORE-002`, `CONTENT-004`).
- [ ] Change requests, stale-conflict handling, revision history, rollback, and suggestion mode (`CORE-014` through `CORE-017`).
- [ ] Contributor/reviewer onboarding gates and controlled anonymous contribution (`CORE-010`, `CORE-019`).
- [ ] Truth-versus-ethics verdict channels, unresolved-content expiry, and issue-first gates (`CORE-022`, `CORE-025`, `CORE-026`).
- [ ] Artifact subtype taxonomy and richer provenance (`CORE-027` through `CORE-029`).
- [ ] Tamper-evident privileged audit events and verification tooling (`CORE-034`).
- [ ] Strict debate modes, revision-linked comment obsolescence, reputation, and deterministic scorecards (`FLOW-007`, `FLOW-010`, `FLOW-021`, `FLOW-022`).
- [ ] Content policy packs, reviewer/screener playbooks, source-quality rubric, and seeded pilot evidence (`CONTENT-001` through `CONTENT-020`, as applicable).
- [ ] Dedicated FixPH information architecture, government/accountability/location models, Vote Wisely workspace, and incident lifecycle (`FIXPH-001` through `FIXPH-008`).
- [ ] React Native monorepo implementation and mobile release validation.

## Verification Checklist

- [x] Focused client tests for header sections, route aliases, and closed mobile sidebar behavior.
- [x] Focused server test for singular comment redirect behavior.
- [x] Server TypeScript no-emit check after the first correction set.
- [x] Full client and server test suites: 58 client suites / 142 tests and 35 server suites / 160 tests passed.
- [x] Production server and client builds.
- [x] PM2 process `35` (`wikitruth`) restart plus post-restart `200` checks for modern artifact, legacy artifact, and `/api/home`.
- [x] Live current-host verification of default header sections, comment redirect, and closed/open mobile overflow at `390x844`.
- [x] Live dynamic About page and seven-family semantic parity verification, including `390x844` overflow checks.
- [ ] Live tenant-host verification of FixPH/application-specific header and Home section navigation.

## Completion Rule

Keep this plan active until every item under **Open Legacy-Replacement Work** and **Verification Checklist** is complete. Modern target-state items may remain deferred only with an explicit product decision; they must not be represented as feature-complete.
