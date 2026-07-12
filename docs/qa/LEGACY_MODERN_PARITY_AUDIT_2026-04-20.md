# Legacy vs Modern Parity Audit (2026-04-20)

## Scope

Parity audit for legacy (`/legacy/*`) and modern (`/*`) across:

- routes/navigation contracts
- page sections/elements
- core user actions
- create/edit/detail workflows

Primary checklist source remains:
`docs/plans/LEGACY_MODERN_MIGRATION_PARITY_AUDIT_CHECKLIST_PLAN_2026-04-19.md`

## Route Pair Audit Matrix

- [x] `/legacy/` vs `/`
- [x] `/legacy/explore` vs `/explore`
- [x] `/legacy/search` vs `/search`
- [x] `/legacy/topic/:friendly/:id` vs `/topics/entry/:friendly/:id`
- [x] `/legacy/visualize` vs `/visualize`
- [x] `/legacy/groups` vs `/groups`
- [x] `/legacy/members` vs `/members`
- [x] `/legacy/admin` vs `/admin`

## Screen/Feature Parity

### Global Navigation + Sidebar

- [x] Modern sidebar includes `Apps`, `Explore`, contextual `In This Section`, and `Related` sections.
- [x] Mobile sidebar toggle exists in modern header.
- [x] Legacy prefix containment implemented for legacy template navigation links (intentional modern escape kept only for explicit `New UX` action).
- [x] Legacy route-shape alias added: `/legacy/:username/settings` -> `/legacy/members/:username/settings`.

### Home

- [x] Jumbotron and three feature cards present.
- [x] Legacy mixed feed (`entrySet`) behavior now preserved on modern home.
- [x] Mixed entity rendering includes topic/fact/question/answer/issue/opinion/artifact.
- [x] `view more` destination for mixed feed columns aligned to `/explore#browse`.

### Explore

- [x] Category tiles, tabbed latest posts, and filtering controls available in modern.
- [x] Latest/Popular sort semantics implemented.
- [x] Admin affordance for creating topic from tab menu implemented.

### Search

- [x] Query input, tab buckets, and scope controls present.
- [x] Keyboard navigation and `view more` behavior present.
- [x] Artifact rows now render via dedicated parity component with labels/subtitle/preview support.
- [x] Deterministic relevance/recency/id ordering, cursor filtering, privacy scoping, and page limits are covered by `tests/server/search-ordering-pagination.test.js`.

### Topic Entry

- [x] Breadcrumb/header/metadata labels present.
- [x] Quick actions row includes reply/expose/bury/visualize/more.
- [x] Details tabs and counts (topics/facts/questions/issues/comments) present.
- [x] Key topics/facts and branch context sections present.
- [x] Child entry lists (topics/facts/questions/artifacts/issues/comments) present.
- [x] Outline search/link/tree interactions are covered by `tests/server/outline-api.test.ts` and the all-route desktop/mobile interaction sweep recorded in the 2026-07-11 completeness audit.

### Entity Create/Edit

- [x] Core create/list/detail routes exist for all key entities.
- [x] Topic edit flow supported from modern create page (`/topics/create?id=...`).
- [x] Argument update API contract is now available (`PUT /api/arguments/entry/:id`).
- [x] All seven form families have an executable legacy-to-modern semantic-field contract in `tests/server/legacy-modern-form-field-parity.test.js`; legacy author selection is intentionally replaced by authenticated actor ownership.

### Visualize

- [x] Dragging + physics enabled.
- [x] Momentum/bounce tuning applied for closer legacy feel.
- [x] Fullscreen toggle and graph navigation available.
- [x] Legacy-style on-canvas node actions (`Explore` + contextual `Visualize`) are available on selected nodes.
- [x] Fullscreen preference is persisted in modern client (`localStorage`: `wt.visualize.fullscreen`).

### Auth + Account

- [x] Login/signup/forgot/reset routes exist in modern.
- [x] Social providers rendered in modern auth/account flows.
- [x] Provider visibility and callback registration are covered by social-auth client/server contract tests and authenticated route verification.

### Members/Groups/Admin

- [x] Members/profile/groups/admin route families are present in modern.
- [x] Group overview and member segmentation parity improvements implemented.
- [x] Admin verdict/moderation/audit routes present in modern.
- [x] Legacy admin root alias (`/legacy/admin`) now routes to modern admin dashboard (`/admin`).
- [x] Backup completion, restore confirmation/scope, preflight parsing, restore audit, and bootstrap safety are covered by `tests/server/admin-db-backup-restore.test.ts` and `tests/server/install-bootstrap.test.ts`.

## Remaining High-Value Validation Tasks

- [x] Full local runtime pair walkthrough and all-route desktop/mobile visual sweep completed; production deployment is not required for local implementation closure.
- [x] Complete per-entity semantic create/edit field contract for topic/argument/question/answer/issue/opinion/artifact.
- [x] Deterministic fixture-based search ordering and cursor/page-limit evidence.
- [x] Admin backup/restore mutation contract and destructive-preflight evidence.

## Closure Reconciliation (2026-07-13)

The older unchecked evidence items above are now closed by repeatable tests and the later all-route runtime audit. This document does not authorize or record a production deployment.

## Runtime Evidence (Local, 2026-04-20)

- Walkthrough script PASS: `node scripts/qa/migration-parity-walkthrough.mjs http://127.0.0.1:8000`
- Screenshot capture PASS: `node scripts/qa/migration-parity-screenshots.mjs http://127.0.0.1:8000 docs/qa/artifacts/parity-screenshots-2026-04-20-local`
- Evidence manifest: `docs/qa/artifacts/parity-screenshots-2026-04-20-local/manifest.json`
