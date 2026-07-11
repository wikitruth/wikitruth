# Legacy vs Modern Feature Completeness Audit Plan (2026-07-11)

## Goal

Re-open legacy-to-modern parity at feature and workflow depth, rather than treating matching routes or HTTP `200` responses as proof of completeness. This audit also distinguishes legacy replacement readiness from the larger modern target-state roadmap.

## Method

- Compared the same public artifact in legacy and modern at desktop and `390x844` mobile viewports.
- Visually audited every distinct modern page surface in public and authenticated states, including administration, moderation, create/edit, member workspace, utility, and error pages.
- Inspected legacy templates/controllers and modern routes/pages/API controllers for public, authenticated, moderation, administration, application-specific, and recovery workflows.
- Rechecked the deferred target-state inventories against current `client/src`, `server/src`, and tests.
- Reviewed parity automation for false-positive and live-data mutation risks.
- Added focused regression tests for each low-risk issue corrected during this pass.

## Current Assessment

### Legacy replacement readiness

**Verified for the audited web-replacement scope.** Core public reading, entry CRUD, discussion, search, visualization, member/group, moderation, admin, empty-database recovery, dynamic About content, disposable privileged-role journeys, and the external FixPH tenant are represented and runtime-verified in modern code.

### Modern target-state completeness

**Core governance modernization is implemented and locally runtime-signed off; broader product programs remain separate.** The modern application includes deterministic duplicate/merge handling, immutable revisions, change requests and rollback, tamper-evident privileged audit events, evidence provenance and quality review, independent factual/ethical verdicts, policy-versioned onboarding, revision-linked discussion context, issue-first controls, controlled anonymous screening proposals, and deterministic reputation scorecards. Automatic content expiry remains explicitly deferred. Full FixPH productization and React Native remain separately scoped programs.

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
| Complete / defer | Issue-first gates and unresolved-content expiry | Issue-first controls are implemented; automatic expiry remains unsafe without mature thresholds, notices, exceptions, and retention policy | Keep human resolution and administrator override behavior. Do not silently expire or mutate content. |
| Complete | Controlled anonymous contribution | Implemented as a proposal-only screening queue with privacy-preserving network fingerprints, quotas, risk checks, duplicate detection, and no automatic publishing | Keep disabled by default in production unless moderation capacity is explicitly approved. |
| Complete / defer | Reputation, scorecards, and strict debate | Deterministic reputation snapshots, badges, profile scorecards, and trusted ranking are implemented; broad strict-debate enforcement remains a policy program | Keep scoring formula-versioned and explainable. Pilot strict debate only after explicit rules exist. |
| Separate program | FixPH productization | Valid extension roadmap; current implementation is tenant shell/configuration, not the full accountability product | Stabilize the core governance/data model and external tenant first, then execute FixPH information architecture and domain models as a separately scoped program. |
| Separate program | React Native client | Valid roadmap; bearer-token APIs exist but no mobile workspace is implemented | Start shared contracts and transport only after the security wave and core API schemas stabilize. Defer full native UI until web workflows are stable. |
| Verification | Credentialed role parity and external FixPH tenant | Valid release-signoff checks, not missing product implementation | Run with dedicated disposable/staging accounts; repair external DNS/proxy/firewall reachability before claiming FixPH tenant signoff. |

## Feature Matrix

| Area | Legacy parity | Modern completeness | Evidence / decision |
| --- | --- | --- | --- |
| Global header and application sections | Corrected in this pass | Modern adds Create and account notification affordances | Modern previously omitted legacy Debates/Dictionary/Manuscripts and tenant sections even though `/api/home` returned them. |
| Responsive shell and context sidebar | Corrected in this pass; deployment verification pending | Modern retains a usable slide-out sidebar | Closed modern sidebar widened a 390 px document to 680 px; legacy removed the closed panel from layout. |
| Home / Explore / Search | Substantially present | Advanced Explore filters and keyboard navigation exceed legacy | FixPH/application feature-card URLs were normalized in this pass so client-side navigation does not 404. |
| Topic / argument / question / answer / issue / opinion / artifact entries | Verified | Modern adds signals, appeals, persisted reactions, and timeline | Public semantic comparison and disposable reader/contributor/screener/reviewer/admin journeys cover all seven families without retained test identities. |
| Comment terminology and URLs | Corrected in this pass | Opinion remains the canonical model | Added `/comment/*` and `/comments/*` compatibility paths to the modern opinion pages. |
| Members, profiles, journals, groups | Present in code and focused tests | Modern follow/subscription support exceeds legacy | Full role/session runtime journey remains an audit item. |
| Screening, verdicts, conversion, ownership | Present in modern API/UI | Signals, appeals, and bulk verdict operations exceed legacy | Requires credentialed screener/reviewer/admin runtime verification. |
| Admin CRUD and backup/restore | Present for authenticated admins | Audit timeline is modern-only | Normal admin restore is tested; empty-database bootstrap is not covered by this path. |
| Fresh install / empty database recovery | Implemented and tested | Secure one-time bootstrap plus normal admin restore | `/api/install` now requires an empty core database, server-side token, CSRF, `RESTORE`, backup preflight, rate limit, and post-restore checks. Initialized systems direct admins to `/admin/db-backup`. |
| Dynamic application About pages | Implemented and live-verified | About hierarchy is public without exposing profile pages | `/about/:id` uses `/api/pages/about/:id`, limits results to the About root/children, sanitizes HTML, and serves direct nested routes from the React shell. |
| Controlled anonymous contribution | Not required for legacy replacement | Implemented as screened proposals, never direct publication | `/contribute` submits quota- and risk-controlled proposals; `/admin/anonymous-contributions` supports review and adoption into authenticated create flows. Raw IP addresses and user agents are not retained. |
| Reputation and scorecards | Modern-only | Implemented with deterministic, explainable snapshots | Member profiles expose four scoring dimensions and earned badges; Explore offers a trusted ranking using reputation, screening state, and popularity inputs. |
| QA proof | Public and privileged semantic coverage complete | Improved | `migration-parity-semantic.mjs` covers all seven families and mobile overflow; `run-disposable-authenticated-parity.mjs` provisions and removes isolated role fixtures while retaining only a redacted manifest. |
| Mobile/native client | Not a legacy-web parity requirement | Planned, not implemented | `REACT_NATIVE_MONOREPO_CHECKLIST_PLAN_2026-04-19.md` remains active with its implementation backlog. |

## Verified Defects Corrected in This Pass

- [x] Hide the closed off-canvas sidebar at mobile breakpoints so it cannot create horizontal overflow.
- [x] Restore legacy default header sections: Debates, Dictionary, and Manuscripts.
- [x] Render tenant/application sections in the modern header.
- [x] Normalize legacy-style application topic URLs in both Header and Home navigation.
- [x] Add modern comment list/create/entry aliases backed by the Opinion implementation.
- [x] Update the authenticated parity runner to locate the current modern `more` action menu.
- [x] Require explicit `WT_PARITY_ALLOW_SIGNUP=true` before parity QA creates a generated account.
- [x] Remove mobile document overflow from visualization topic controls, outline tree labels, Fast Switch PIN inputs, and database backup paths.
- [x] Serve `/contribute` and modern `/comments/*` aliases through the React shell on direct navigation and refresh.

## Open Legacy-Replacement Work

- [x] Design and implement a secure one-time empty-database bootstrap/restore flow reached from `/install`.
- [x] Add a modern public dynamic application page contract and `/about/:id` route, including not-found and visibility rules.
- [x] Add semantic DOM/action inventory comparisons to parity QA; do not treat screenshots plus HTTP `200` as a parity assertion.
- [x] Run credentialed reader/contributor/screener/reviewer/admin parity without creating persistent test users, and retain a redacted manifest.
- [x] Expand live representative entry checks from the artifact sample to all seven entity families on desktop and mobile.

## Open Modern Target-State Work

The following remain genuinely pending after current-code searches. Detailed requirement IDs remain in `docs/plans/deferred/plan-2026-04-14/`.

- [x] Duplicate detection, deterministic merge, redirects, and moderator logs (`CORE-002`, `CONTENT-004`).
- [x] Change requests, stale-conflict handling, revision history, rollback, and suggestion mode (`CORE-014` through `CORE-017`).
- [x] Policy-versioned contributor/reviewer onboarding gates (`CORE-010`).
- [x] Independent truth-versus-ethics verdict channels (`CORE-022`).
- [x] Accepted-critical issue-first gates, reasoned resolution, and audited administrator override (`CORE-026`).
- [x] Artifact subtype taxonomy, internal/external evidence modes, provenance, and source-quality review (`CORE-027` through `CORE-029`).
- [x] Tamper-evident privileged audit events and verification tooling (`CORE-034`).
- [x] Revision-linked comment context, supersession flags, and reasoned relevance decisions (`FLOW-010`).
- [x] Content policy packs, reviewer/screener playbooks, source-quality rubric, and seeded live pilot evidence (`CONTENT-001` through `CONTENT-020`, as applicable).
- [x] Controlled anonymous proposal intake, risk/duplicate screening, moderation queue, and authenticated adoption (`CORE-019`).
- [x] Formula-versioned contributor/reviewer reputation signals and trusted ranking inputs (`FLOW-021`).
- [x] Deterministic badges and contributor profile scorecards (`FLOW-022`).
- Separate program: dedicated FixPH information architecture, government/accountability/location models, Vote Wisely workspace, and incident lifecycle (`FIXPH-001` through `FIXPH-008`).
- Separate program: React Native monorepo implementation and mobile release validation.

### Implementation Progress (2026-07-11)

- `54bf2cc8` added the operating policy baseline for duplicate/merge decisions, source quality, moderation roles, and independent truth/ethics review.
- `38fa284b` added scoped deterministic candidate detection, exact duplicate prevention for all seven entry families, stale-preview validation, moderator-approved merges, relationship migration summaries, durable API redirects, source tombstones, privileged merge events, and the modern duplicate-review UI.
- `c8ac6673` added immutable numbered revision snapshots for all seven entry families, public revision metadata, partial change-request acceptance, stale-base detection, reviewer rollback, pre/post-merge revision links, hash-chained privileged events, chain verification UI/API, and backup coverage for integrity collections.
- `a71847d3` added backward-compatible artifact taxonomy and provenance, five-dimension source-quality review, independently queryable factual and ethical verdict channels, atomic dual-channel updates, revision capture, privileged audit evidence, and modern review UI.
- `4290c1dc` added policy-versioned contributor/reviewer onboarding, new-user and future-promotion gates, account completion UI, role-switch filtering, server-side entry-write enforcement, reviewer-decision enforcement, and role/onboarding audit evidence. Existing role holders remain grandfathered for compatibility.
- `c80c7ac7` added direct issue targeting across entry families, accepted-critical issue gates for discussion and final factual verdicts, reasoned reviewer resolution, audited administrator override, revision-linked comment context, automatic supersession warnings, and reviewer relevance decisions without deleting history.
- `9c545f2d` added and executed the read-only live content-policy pilot across all seven entry families, retaining a redacted manifest and an operational adoption queue without bulk-mutating legacy records.
- `62aa1cd3` added the disposable authenticated parity runner, verified reader/contributor/screener/reviewer/admin behavior across all seven entry families, removed every temporary identity, and fixed active-role action visibility exposed by the run.
- `7ed69015` prevented merge-redirect ObjectId casting from intercepting friendly topic slugs, preserving application section navigation and canonical topic redirects.
- `ee859b32` added controlled anonymous proposals, privacy-preserving anti-abuse controls, receipt lookup, reviewer adoption, and queue administration without automatic publication.
- `04d75333` added deterministic reputation snapshots, dimension scorecards, earned badges, profile/member presentation, and trusted Explore ranking.
- `94264826` fixed the mobile overflows found by the all-route visual audit; `55a37e2a` restored direct shell delivery for contribution and comment routes.
- Operational correction: FixPH is not running a separate modern PM2 instance. `fixthephilippines.org` remains pointed at the existing shared production instance, and this modernization batch was not deployed to production or a VPS.

### Explicitly Deferred Product Decisions

- Automatic unresolved-content expiry (`CORE-025`) is disabled by policy; unresolved records remain visible until a human resolution because thresholds, notices, exceptions, and retention obligations are not mature enough for destructive automation.
- A broad strict-debate rollout remains deferred until explicit operating rules and a governed pilot define enforceable behavior.
- Full FixPH productization and React Native delivery remain separate programs; they are not legacy-replacement blockers.

## Verification Checklist

- [x] Focused client tests for header sections, route aliases, and closed mobile sidebar behavior.
- [x] Focused server test for singular comment redirect behavior.
- [x] Server TypeScript no-emit check after the first correction set.
- [x] Full current client and server test suites: 67 client suites / 159 tests and 49 server suites / 215 tests passed on 2026-07-12; the route-shell correction also passed its focused 5-test suite and server typecheck.
- [x] Production server and client builds.
- [x] PM2 process `35` (`wikitruth`) restart plus post-restart `200` checks for modern artifact, legacy artifact, and `/api/home`.
- [x] Live current-host verification of default header sections, comment redirect, and closed/open mobile overflow at `390x844`.
- [x] Live dynamic About page and seven-family semantic parity verification, including `390x844` overflow checks.
- [x] Live tenant-host verification of FixPH/application-specific header and Home section navigation, including external Home-to-People canonical navigation on the production tenant.
- [x] Local visual audit of 87 public routes and 50 authenticated routes at both `1280x720` and `390x844` (274 rendered page checks), with populated admin/member/editor records where available.
- [x] Direct HTTP shell-contract sweep of all 128 declared modern routes: 124 direct `200` HTML responses and four intentional canonical redirects.
- [x] Responsive interaction checks for entry Reply/More menus, trusted Explore ranking, global navigation, and sidebar behavior with zero document overflow.
- [x] Disposable visual-audit user, account, administrator, sessions, and reputation snapshot removed with zero residue.

## Completion Rule

Keep this plan active until every item under **Open Legacy-Replacement Work** and **Verification Checklist** is complete. Modern target-state items may remain deferred only with an explicit product decision; they must not be represented as feature-complete.
