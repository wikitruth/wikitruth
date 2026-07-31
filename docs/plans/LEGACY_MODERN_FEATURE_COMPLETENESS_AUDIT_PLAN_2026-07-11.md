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

**Non-deferred local legacy-replacement readiness is verified.**
Core public reading, entry CRUD, discussion, search, member/group, moderation,
admin, empty-database recovery, dynamic About content, disposable privileged-role
journeys, and FixPH are represented in modern code. The 2026-07-15 visual and
feature-depth revalidation found information-density, navigation,
visualization, authorization-UX, identity-hydration, and mobile breadcrumb gaps;
those gaps were implemented and passed a separate final verification run.

### Modern target-state completeness

**Core governance modernization, the FixPH civic product baseline, and non-deferred frontend completion are locally signed off.** The modern application includes deterministic duplicate/merge handling, immutable revisions, change requests and rollback, tamper-evident privileged audit events, evidence provenance and quality review, independent factual/ethical verdicts, policy-versioned onboarding, revision-linked discussion context, issue-first controls, controlled anonymous screening proposals, deterministic reputation scorecards, explicit archived/freshness UX, dedicated civic accountability workflows, tenant-scoped operations, governed record maintenance, rich entry presentation, and verified responsive navigation. Automatic content expiry and React Native delivery are explicitly deferred.

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
| Complete | FixPH civic productization baseline | Dedicated civic domain, public workspace, responsibility hierarchy, projects, observations, locations, incidents, elections, actions, and history are implemented | Real-world seed content and operating adoption remain content operations, not missing software implementation. |
| Deferred program | React Native client | Valid roadmap; bearer-token APIs exist but no mobile workspace is implemented | No implementation is scheduled following the explicit 2026-07-13 deferral decision. |
| Complete | Credentialed role parity and FixPH civic verification | Disposable role fixtures and local civic runtime checks passed | External production topology remains an operational concern and must not be changed without explicit deployment authorization. |

## Feature Matrix

| Area | Legacy parity | Modern completeness | Evidence / decision |
| --- | --- | --- | --- |
| Global header and application sections | Corrected in this pass | Modern adds Create and account notification affordances | Modern previously omitted legacy Debates/Dictionary/Manuscripts and tenant sections even though `/api/home` returned them. |
| Responsive shell and context sidebar | Corrected and runtime-verified | Modern retains a usable slide-out sidebar | Closed modern sidebar previously widened a 390 px document to 680 px; current mobile checks show no document overflow. |
| Home / Explore / Search | Presentation parity corrected | Advanced Explore filters and keyboard navigation exceed legacy | Rich shared rows now retain parent context, excerpts, semantic statuses, authorship, interaction metadata, and artifact media. |
| Topic / argument / question / answer / issue / opinion / artifact entries | Core flows and presentation corrected | Modern adds signals, appeals, persisted reactions, and timeline | Rich related rows, creator hydration, mobile breadcrumbs, and focused answer discussion are implemented and covered. |
| Comment terminology and URLs | Corrected in this pass | Opinion remains the canonical model | Added `/comment/*` and `/comments/*` compatibility paths to the modern opinion pages. |
| Members, profiles, journals, groups | Functional and navigation-corrected | Modern follow/subscription and reputation support exceed legacy | Shared group tabs, rich group rows, and deterministic member avatars are implemented; private journal authorization remains intentionally enforced. |
| Screening, verdicts, conversion, ownership | Verified in modern API/UI and disposable role journeys | Signals, appeals, and bulk verdict operations exceed legacy | Contributor, screener, reviewer, and administrator behavior is covered without retained test identities. |
| Admin CRUD and backup/restore | Present for authenticated admins | Audit timeline is modern-only | Normal admin restore and secure empty-database bootstrap contracts are tested separately. |
| Fresh install / empty database recovery | Implemented and tested | Secure one-time bootstrap plus normal admin restore | `/api/install` now requires an empty core database, server-side token, CSRF, `RESTORE`, backup preflight, rate limit, and post-restore checks. Initialized systems direct admins to `/admin/db-backup`. |
| Dynamic application About pages | Implemented and live-verified | About hierarchy is public without exposing profile pages | `/about/:id` uses `/api/pages/about/:id`, limits results to the About root/children, sanitizes HTML, and serves direct nested routes from the React shell. |
| Controlled anonymous contribution | Not required for legacy replacement | Implemented as screened proposals, never direct publication | `/contribute` submits quota- and risk-controlled proposals; `/admin/anonymous-contributions` supports review and adoption into authenticated create flows. Raw IP addresses and user agents are not retained. |
| Reputation and scorecards | Modern-only | Implemented with deterministic, explainable snapshots | Member profiles expose four scoring dimensions and earned badges; Explore offers a trusted ranking using reputation, screening state, and popularity inputs. |
| FixPH civic accountability | Modern-only | Implemented as a dedicated local product workspace | The deterministic local tenant covers all record kinds and sections; active mobile navigation is automatically centered with explicit overflow affordances. |
| Lifecycle reading modes | Improved over legacy | Implemented | Accepted, Pending, Archived, and All states are explicit; archived entries and reference-dated information show non-destructive reader notices. |
| QA proof | Broad route, semantic, privileged, and visual coverage verified | Improved | The final 306-render audit has zero regressions, navigation failures, `5xx`, request failures, or modern overflow. Disposable role and civic fixtures clean up successfully. |
| Mobile/native client | Not a legacy-web parity requirement | Deferred, not implemented | `docs/plans/deferred/REACT_NATIVE_MONOREPO_CHECKLIST_PLAN_2026-04-19.md` was explicitly deferred on 2026-07-13. |

## Revalidation Findings (2026-07-15)

Current detailed evidence and page-family results are in
`docs/qa/LEGACY_MODERN_LIVE_VISUAL_AUDIT_2026-07-15.md`.

- [x] Replace numeric screening status codes with semantic labels in all seven
  entry row families.
- [x] Restore useful parent context, excerpts, authorship, status, dates,
  interactions, and artifact media across Home, Explore, Search, lists, and
  related-entry sections.
- [x] Build visualization from the existing outline-tree API instead of only
  the five-item Home payload.
- [x] Add persistent About/Posts/Members navigation to every group subroute.
- [x] Repair creator/editor hydration and empty artifact-editor grammar.
- [x] Fix the mobile fixed-header collision that visually covers breadcrumbs.
- [x] Serve the branded React 404 for arbitrary direct browser URLs.
- [x] Add consistent route-level authentication/role guards for account,
  authoring/editing, owner workspace, screening/conversion, outline mutation,
  Notifications, and Admin pages before protected forms and data requests mount.
- [x] Keep the active FixPH section visible in its horizontal navigation and
  add an overflow affordance.
- [x] Implement a real `Remember me` session choice or remove the no-op field.
- [x] Decide whether answers need a dedicated discussion route and align route
  inventory/tests with that decision.
- [x] Harden or isolate `/legacy/topics/create` and
  `/legacy/members/contributors`; both currently crash the shared PM2 process.
- [x] Re-run the 306-render public sweep, seven-family semantic suite, and
  disposable five-role audit after remediation.

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

The target-state inventory was revalidated against current code. All non-deferred items below are complete; the detailed historical requirement IDs remain in `docs/plans/deferred/plan-2026-04-14/`.

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
- [x] Dedicated FixPH information architecture, government/accountability/location models, Vote Wisely workspace, and incident lifecycle (`FIXPH-001` through `FIXPH-008`).
- Deferred program: React Native monorepo implementation and mobile release validation.

### Implementation Progress (2026-07-11)

- `4af9b33d` aligned modern route access with API authorization: account,
  authoring/editing, current-member workspace, outline mutation, screening,
  conversion, Notifications, and Admin surfaces now guard before protected
  components or requests mount. The public Create chooser and controlled
  anonymous proposal flow remain available. Focused route/auth/login tests,
  lint, type checking, and the production client build passed.
- Final independent verification on 2026-07-15 completed 306 renders with zero
  regressions, navigation failures, `5xx`, request failures, or modern overflow;
  passed all seven semantic entry families and all five disposable roles with
  cleanup; passed 61 server suites / 266 tests and 83 client suites / 203 tests;
  and passed smoke guardrails plus production server/client builds. Local PM2
  process `35` remained online and did not restart during the final sweep.
- `9bf26051` closed a content-level topic discrepancy found during direct
  screenshot inspection after the aggregate sweep: hydrated topic creator and
  editor names now survive JSON serialization, the topic header identifies its
  actual parent, and existing verdict, tag, and link-count metadata renders with
  legacy-compatible semantics. Focused client/server tests, both TypeScript
  checks, and production server/client builds passed.
- `110afa37` corrected the final two modern console defects found by the
  independent public sweep: answer discussion context now resolves the answer
  identifier instead of the `discussion` suffix, and unauthorized journal
  views render an explicit private state without issuing a forbidden request.
  Owner and administrator journal access remain covered. The same group aligned
  a stale Civic overview test fixture with the current typed API contract; all
  82 client suites / 201 tests and the production client build passed.
- `aa7ced4f` closed an additional missing-group crash exposed by the independent
  306-render rerun and wrapped all mounted legacy controller GET/POST promises
  so rejected handlers are forwarded to Express instead of terminating the
  shared process. Missing legacy group overview/member routes now return `404`.
- `ef6792ff` hardened anonymous legacy topic creation, restored the named
  contributors-directory route ahead of the username route, intercepted
  unknown member profiles, and fixed exact legacy-mount redirects. Modern and
  legacy type checks plus 35 focused legacy runtime tests passed.
- `f5bcbd82` added route-level authentication and role guards, safe post-login
  return URLs, branded direct-route `404` shell delivery, mobile fixed-header
  breadcrumb clearance, auto-centered FixPH section navigation with overflow
  affordances, and removed the no-op `Remember me` control. Focused tests,
  production client build, and rendered `390x844` checks passed.
- `83506978` switched visualization to the depth-four outline hierarchy with a
  bounded 500-node traversal, added persistent group About/Posts/Members tabs
  and rich group activity rows, introduced a focused answer discussion route,
  and differentiated member/profile avatars with deterministic patterns.
- `e963ed49` centralized rich entry-row presentation across all seven families,
  replaced numeric screening codes with semantic labels, restored parent,
  excerpt, author, date, interaction, and artifact-media context, and fixed
  creator/editor hydration with focused client/server regression coverage.
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
- `8ea071ee` eliminated the 66-warning client lint baseline by stabilizing hooks and intentional-unused conventions.
- `4c2dfb33` added the dedicated FixPH civic model, public and governed APIs, accountability workspace, project detail, observation lifecycle, geo filters, candidate comparison, and durable history.
- `dd91bb9d` added tenant actor, membership candidate, membership administration, and audited jurisdiction contracts; safe nested record updates; cycle prevention; OpenAPI coverage; and defensive tenant normalization.
- `d55f4c4a` added the modern tenant operations page, tenant-role-aware contribution/review controls, contributor-owned record editing, and client regression coverage.
- `21955ce0` added explicit Accepted/Pending/Archived/All reading modes plus reference-date and archived-record notices without automatic expiry.
- `c33a8555` published the complete content-operations handbook set; `42ed723b` added repeatable form-field and search-ordering parity evidence.
- Operational correction: FixPH is not running a separate modern PM2 instance. `fixthephilippines.org` remains pointed at the existing shared production instance, and this modernization batch was not deployed to production or a VPS.

### Explicitly Deferred Product Decisions

- Automatic unresolved-content expiry (`CORE-025`) is disabled by policy; unresolved records remain visible until a human resolution because thresholds, notices, exceptions, and retention obligations are not mature enough for destructive automation.
- A broad strict-debate rollout remains deferred until explicit operating rules and a governed pilot define enforceable behavior.
- Legacy-renderer retirement and React Native delivery were explicitly deferred on 2026-07-13 and are not part of the active execution queue.

## Verification Checklist

- [x] Focused client tests for header sections, route aliases, and closed mobile sidebar behavior.
- [x] Focused server test for singular comment redirect behavior.
- [x] Server TypeScript no-emit check after the first correction set.
- [x] Full current client and server test suites: 83 client suites / 203 tests and 61 server suites / 266 tests passed on 2026-07-15.
- [x] Production server and client builds.
- [x] PM2 process `35` (`wikitruth`) restart plus post-restart `200` checks for modern artifact, legacy artifact, and `/api/home`.
- [x] Live current-host verification of default header sections, comment redirect, and closed/open mobile overflow at `390x844`.
- [x] Live dynamic About page and seven-family semantic parity verification, including `390x844` overflow checks.
- [x] Historical tenant-host verification of FixPH/application-specific navigation is retained; the temporary separate-modern production topology was subsequently rolled back and is not part of this local modernization signoff.
- [x] Local visual audit of 87 public routes and 50 authenticated routes at both `1280x720` and `390x844` (274 rendered page checks), with populated admin/member/editor records where available.
- [x] Direct HTTP shell-contract sweep of all 128 declared modern routes: 124 direct `200` HTML responses and four intentional canonical redirects.
- [x] Responsive interaction checks for entry Reply/More menus, trusted Explore ranking, global navigation, and sidebar behavior with zero document overflow.
- [x] Disposable visual-audit user, account, administrator, sessions, and reputation snapshot removed with zero residue.
- [x] FixPH focused API/client/route/OpenAPI tests plus the current full 56-suite server and 74-suite client regression runs.
- [x] Legacy/modern semantic form-field contracts for all seven entry families and deterministic search ordering/cursor/privacy fixtures.
- [x] Zero-warning lint, modern/legacy type checks, production builds, and source guardrails after lifecycle and FixPH implementation.
- [x] Disposable authenticated Google Chrome verification of platform tenant configuration, tenant membership and jurisdiction operations, contributor record create/edit, knowledge-link add/remove, lifecycle review, and mobile overflow with zero mutable fixture residue.
- [x] Final public 306-render sweep after all remediation: zero regressions,
  navigation failures, `5xx`, request failures, modern overflow, or fully hidden
  breadcrumbs; only the intentional branded modern `404` logged a modern
  resource error.
- [x] Final seven-family semantic and disposable reader/contributor/screener/
  reviewer/admin parity reruns, with zero action errors and verified cleanup.

## Completion Rule

Keep this plan active until every item under **Open Legacy-Replacement Work** and **Verification Checklist** is complete. Modern target-state items may remain deferred only with an explicit product decision; they must not be represented as feature-complete.

The 2026-07-15 revalidation checklist is implemented and has passed its separate
verification stage. This plan remains active rather than moving to `completed/`
because the explicit legacy-retirement, automatic-expiry, strict-debate, and
React Native product decisions remain deferred.

## Functional and Visual Revalidation (2026-07-28)

The current detailed report is
`docs/qa/LEGACY_MODERN_FUNCTIONAL_VISUAL_AUDIT_2026-07-28.md`. This pass is
strictly about functionality and implementation; live content migration and
production deployment are excluded until separately authorized.

- [x] Re-inspect the live public and signed-in legacy shell, Home, Explore,
  Search, Visualize, semantic families, editors, groups, and members.
- [x] Stop the live traversal when `/members/contributors` reproduced the known
  legacy process crash; confirm production recovered without making a change.
- [x] Re-run seven-family semantic parity on the current local build.
- [x] Re-run disposable reader, contributor, screener, reviewer, and
  administrator action parity with verified identity cleanup.
- [x] Render 109 representative local routes at desktop and `390x844` mobile
  sizes, covering public, account, authoring, member, moderation, admin, civic,
  error, entry, discussion, and edit surfaces (218 renders).
- [x] Restore the legacy `479px` wordmark breakpoint.
- [x] Suppress duplicated usernames in member directories.
- [x] Make long profile names wrap without mobile document overflow.
- [x] Preserve the civic tenant-operations heading in access-denied states.
- [x] Record Explore density, exact GeoPattern palettes, legacy Move/Swap Link
  terminology, and title-tagline policy for future consideration while
  retaining the current modern behavior.

The 2026-07-31 product decision retains the responsive modern Explore density,
deterministic modern GeoPattern palette, governed relationship actions rather
than cosmetic Move/Swap duplication, and concise browser titles. Those choices
may be reconsidered only under a separately approved UX,
relationship-semantics, branding, or SEO scope. This plan remains active because
it contains explicitly deferred product programs; it must not be moved to
`completed/` while those deferrals remain.
