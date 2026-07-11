# Legacy vs Modern Migration Parity Audit Checklist Plan (2026-04-19)

## Goal

Audit legacy (`/legacy/*`) versus modern (`/*`) behavior in a single checklist that tracks parity by:

- feature area
- screen/route
- sections/elements
- user actions
- navigation contracts
- known divergences and missed migrations

This document is the working source of truth for parity tracking from this date forward.

## Audit Baseline (Code-Evidence Pass)

Audit references used for this pass:

- Modern routes: `client/src/routes/routeConfig.tsx`
- Modern shell + redirects: `server/src/middlewares/routes.ts`
- Legacy compatibility mount: `legacy/compatibility/server/bootstrap.ts`
- Legacy route controllers: `legacy/server/controllers/**`
- Legacy global layout/nav: `legacy/templates/dust/layouts/master.dust`, `legacy/templates/dust/layouts/header.dust`
- Modern global layout/nav: `client/src/components/Layout/Layout.tsx`, `client/src/components/Layout/Header.tsx`, `client/src/components/Layout/ContextSidebar.tsx`
- Key page comparisons:
  - Home: `legacy/templates/dust/index.dust` vs `client/src/pages/HomePage.tsx`
  - Explore: `legacy/templates/dust/wiki/explore.dust` vs `client/src/pages/ExplorePage.tsx`
  - Search: `legacy/templates/dust/search.dust` vs `client/src/pages/SearchPage.tsx`
  - Topic entry: `legacy/templates/dust/wiki/topics/entry.dust` vs `client/src/pages/TopicEntryPage.tsx`
  - Visualize: `legacy/templates/dust/wiki/visualize.dust` vs `client/src/pages/VisualizePage.tsx`
  - Auth/account: `legacy/templates/jade/login/index.jade`, `legacy/templates/jade/signup/index.jade`, `legacy/templates/jade/account/settings/index.jade` vs `client/src/pages/LoginPage.tsx`, `client/src/pages/FastSwitch/FastSwitchPage.tsx`, `client/src/pages/Account/SettingsPage.tsx`
  - Members/groups/admin: `legacy/templates/dust/members/profile/*.dust`, `legacy/templates/dust/groups/group/*.dust`, `legacy/templates/jade/admin/*.jade` vs `client/src/pages/Members/**`, `client/src/pages/Groups/**`, `client/src/pages/Admin/**`

### Status Legend

- `[x]` Present in modern code and appears parity-aligned at code level
- `[ ]` Missing, partial, or needs runtime parity validation

## Route Ownership Snapshot

### Current ownership contracts

- `[x]` Modern app shell is root-based (`/`, `/explore`, `/topics/...`, etc.)
- `[x]` Legacy app is mounted under `/legacy/*`
- `[x]` `/app` and `/app/*` are redirect aliases to root modern routes
- `[x]` Legacy aliases (`/home`, `/wiki`, singular entry aliases) are redirected to modern equivalents
- `[x]` Legacy admin root alias `/legacy/admin` intentionally stays in legacy namespace and redirects to `/legacy/admin/db-backup` (modern admin remains `/admin`)

### Legacy route surface without clear modern equivalent (needs explicit decision)

- `[x]` `/legacy/related` -> root legacy alias `/related` now redirects to best-matching modern entry route by query target (topic/argument/question/answer/issue/opinion/artifact), with fallback to `/explore`
- `[x]` `/legacy/verdict/update` -> root legacy alias now redirects to `/admin/verdicts/:id?type=...` (or `/admin/verdicts` when no target id)
- `[x]` topic/argument link entry routes (`/topic/.../link/:id`, `/argument/.../link/:id`, plus `/topics/link/edit`, `/arguments/link/edit`) now redirect to modern entry routes with explicit `topicLink` / `argumentLink` query context
- `[x]` `/legacy/outline/create` now redirects to `/outline/link` with propagated `parentId` context when present (fallback to `/create`)
- `[x]` `/legacy/:username/settings` now aliases to canonical legacy profile settings route (`/legacy/members/:username/settings`)

### Modern-only routes (intentional enhancements unless noted)

- `[x]` `/notifications`
- `[x]` `/timeline`
- `[x]` `/create` (wizard)
- `[x]` `/admin/audit`
- `[x]` `/admin/moderation/signals`
- `[x]` modern error routes `/500`, `/503`

## Screen and Feature Parity Checklist

### 1) Global Shell, Navigation, and Context Sidebar

- `[x]` Header brand + Explore + Search + More menu parity exists
- `[x]` Signed-in account dropdown parity exists (profile, journal, admin, sign out)
- `[x]` Mobile nav toggle exists in modern header
- `[x]` Mobile sidebar toggle exists in modern header (`visible-sm`/`visible-xs`)
- `[x]` Sidebar contains `Apps` section
- `[x]` Sidebar contains `Explore` categories section
- `[x]` Sidebar contains `In This Section` contextual items by route family
- `[x]` Sidebar contains topic-context nested children/siblings for topic entry
- `[x]` Sidebar contains `Related` section on topic pages
- `[x]` Sidebar contains authenticated user shortcuts
- `[x]` Validate sidebar item ordering and visual hierarchy match legacy on all major screens
- `[x]` Validate all legacy page links under `/legacy/*` stay prefix-scoped and do not leak to root modern URLs unless explicitly intended (intentional root escape kept only for explicit “New UX” navigation)

### 2) Home (`/legacy/` vs `/`)

- `[x]` Jumbotron with Explore/Visualize/Learn More CTAs
- `[x]` Feature section cards (Truth & Reality, Religion & Worldviews, Morality & Ethics)
- `[x]` Latest posts mixed feed section exists
- `[x]` Mixed entity rendering includes topics/facts/questions/answers/issues/opinions/artifacts
- `[x]` Entry row components are wired for core entity types
- `[x]` Legacy home mixed `entrySet` ordering is now preserved in modern home feed (removed custom ranking buckets)
- `[x]` “view more” behavior for legacy-style mixed home feed points to `/explore#browse` across rendered entry-set columns

### 3) Explore (`/legacy/explore` vs `/explore`)

- `[x]` Category tiles with subtopic/subargument previews
- `[x]` Latest posts section with tabs for all entity types
- `[x]` Tab filtering via query params
- `[x]` Screening/verdict/relationship/tag filter controls in modern
- `[x]` Content view selector exists in modern
- `[x]` “Latest vs Popular” interaction parity implemented on modern Explore (`sort=latest|popular` with deterministic ordering)
- `[x]` Admin “new topic in tab menu” affordance parity implemented on modern Explore tabs

### 4) Search (`/legacy/search` vs `/search`)

- `[x]` Search input + submit + query param contract
- `[x]` Content scope radios (`all/wiki/journal`) for authenticated users (legacy `diary` alias supported)
- `[x]` Tabbed result buckets for all entity types
- `[x]` “View more” pagination-style behavior in all-tab mode
- `[x]` Empty-result UX exists
- `[x]` Modern adds keyboard result navigation (up/down/enter, escape)
- `[x]` Validate result ordering and paging parity with identical fixture data
- `[x]` Artifact result rows now use dedicated modern `ArtifactEntryRow` with subtitle/labels/content-preview support aligned to legacy row depth

### 5) Topic Entry and Shared Entry Detail Behavior

- `[x]` Breadcrumb + page header + metadata badges
- `[x]` Quick actions row + “Actions” dropdown
- `[x]` Tabs for Details/Topics/Facts/Questions/Issues/Comments with counts
- `[x]` Main content with collapse/see-more behavior
- `[x]` Key topics/key facts sections
- `[x]` Branch context panel (subtopics/siblings/peer categories)
- `[x]` Related topics chips
- `[x]` Child entry lists for topics/facts/questions/artifacts/issues/comments
- `[x]` Entry actions include edit/follow/share/reply/copy/link/history/report/signal/appeal/screening/convert/delete (role-gated)
- `[x]` Validate parity of legacy entry-outline behavior included from `dust/wiki/common/entry-outline`
- `[x]` Validate “link-entry” flows (topic/argument link entities) are fully reachable and editable in modern UX

### 6) Entity List + Create/Edit Flows (Topics, Arguments, Questions, Answers, Issues, Opinions, Artifacts)

- `[x]` List routes exist for all core entity types
- `[x]` Create routes exist for all core entity types
- `[x]` Edit routes exist where expected
- `[x]` Entry routes exist (friendly + id variants where needed)
- `[x]` Discussion subroutes exist on modern entry pages
- `[x]` Validate per-entity create form field parity against legacy forms
- `[x]` Validate per-entity moderation controls and post-create redirects parity

### 7) Visualize (`/legacy/visualize` vs `/visualize`)

- `[x]` Vis network rendering exists in modern
- `[x]` Node dragging + physics enabled in modern
- `[x]` Fullscreen toggle exists in modern
- `[x]` Topic selection and entry navigation from graph nodes exists
- `[x]` Legacy-style momentum extension after drag exists in modern (`dragEnd` simulation window)
- `[x]` Drag “feel” parity tuned in modern visualize graph (drag-duration/distance momentum window + lower drag damping for bounce continuity)
- `[x]` Legacy-style node action controls are now present in modern visualize (`Explore` + contextual `Visualize` controls from selected node state)
- `[x]` Visualize fullscreen preference now persists in modern client (`localStorage` key: `wt.visualize.fullscreen`)

### 8) Authentication, Signup, Fast Switch, Account

- `[x]` Login form parity (username/email + password + forgot link)
- `[x]` Fast Switch tab and 6-digit PIN flow parity
- `[x]` Signup page route exists in modern
- `[x]` Social provider buttons in modern include google/github/facebook/twitter/apple/microsoft
- `[x]` Account settings sections exist (contact, identity, password, social connections)
- `[x]` Social connect/disconnect links exist in modern account settings
- `[x]` Runtime provider visibility parity is validated against backend `providers()` contract (server contract + client rendering tests)
- `[x]` Validate full forgot/reset token journey parity from email link to completion

### 9) Members, Profile, Contributions, Pages

- `[x]` Members index and role lists (contributors/screeners/reviewers/administrators) routes exist
- `[x]` Profile overview route exists for self and other user
- `[x]` Profile tabs exist (overview/topics/journal/contributions/following/pages/settings)
- `[x]` Profile settings include private profile + fast switch controls
- `[x]` Custom pages list/create/view routes exist
- `[x]` Profile follow action for non-owner now uses notification subscriptions (`user` object) with follow-state load and toggle action
- `[x]` Validate contributions filtering parity against legacy tabs and counters
- `[x]` Validate journal navigation and context sidebar behavior parity for all journal route states (including legacy diary aliases)

### 10) Groups

- `[x]` Group list/create/entry/posts/members routes exist
- `[x]` Group join/leave/edit actions exist
- `[x]` Group posts page includes per-entity sections and create shortcuts
- `[x]` Group members list exists with role labels
- `[x]` Group overview parity: modern overview now includes contribution stat tiles (total + per entity) backed by API group stats
- `[x]` Group members parity: modern members page now splits `Administrators` and `All Members` and exposes Add/manage affordance for managers
- `[x]` Group route canonicalization validated at code level (friendly/id modern routes plus canonical group URL builder)

### 11) Admin

- `[x]` Admin dashboard and core list/detail routes exist (users/accounts/admins/groups/categories/statuses)
- `[x]` DB backup route/page exists
- `[x]` Verdict queue and verdict update pages exist
- `[x]` Moderation signals/appeals page exists
- `[x]` Audit timeline page exists
- `[x]` Realtime status panel exists in modern dashboard
- `[x]` Validate stat-card parity coverage (legacy includes explicit admins/groups counts in same dashboard layout)
- `[x]` Validate operation-level parity (backup/restore/admin mutations) via runtime checklist execution

### 12) Utility and Secondary Flows

- `[x]` Clipboard page exists
- `[x]` Outline link page exists
- `[x]` Screening and convert pages exist
- `[x]` Contact/about/help/install routes exist
- `[x]` Legacy `/related` flow now resolves via root alias redirect (`/related`) to best-matching modern entry route or `/explore`
- `[x]` Legacy link-edit/entry-link flows are explicitly preserved as redirect aliases into modern entry routes (`topicLink` / `argumentLink` query context)

### 13) QA Tooling and Documentation Parity

- `[x]` Update `scripts/qa/migration-parity-walkthrough.mjs` route set to root-modern contracts (`/*`) with `/app/*` alias checks
- `[x]` Replace stale `/app`-based statements in active parity docs/runbooks with root-route contracts (keep `/app/*` documented as alias)
- `[x]` Add screenshot-based side-by-side checks for key route pairs (`home`, `explore`, `search`, `topic entry`, `visualize`, `group`, `profile`, `admin`) via `scripts/qa/migration-parity-screenshots.mjs`

## Priority Backlog From This Audit

### P0 (Functional parity risks)

- `[x]` PARITY-P0-001: Fix/verify legacy-prefix containment so `/legacy/*` pages do not leak unexpected root modern links
- `[x]` PARITY-P0-002: Implement/redirect unresolved legacy routes (`/related`, `/verdict/update`, link-entry/link-edit flows) with explicit decisions
- `[x]` PARITY-P0-003: Implement non-owner profile follow action (currently placeholder)
- `[x]` PARITY-P0-004: Close group overview/member-detail parity gaps (stats and admin/member segmentation)

### P1 (Behavior and UX parity)

- `[x]` PARITY-P1-001: Validate and tune visualize drag/bounce physics parity against legacy behavior
- `[x]` PARITY-P1-002: Validate explore “Latest/Popular” semantics and align behavior or document intentional divergence
- `[x]` PARITY-P1-003: Verify per-entity create/edit forms against legacy fields/actions

### P2 (Audit infra and long-tail)

- `[x]` PARITY-P2-001: Refresh migration parity QA script to root-modern route contracts
- `[x]` PARITY-P2-002: Consolidate/retire stale parity docs superseded by this checklist
- `[x]` PARITY-P2-003: Add automated smoke checks for unresolved legacy alias endpoints

## Suggested Runtime Verification Matrix

Use this matrix to complete runtime parity sign-off after code-level review:

- `[x]` Pair 01: `/legacy/` vs `/` (walkthrough PASS)
- `[x]` Pair 02: `/legacy/explore` vs `/explore` (walkthrough PASS)
- `[x]` Pair 03: `/legacy/search?q=<term>` vs `/search?q=<term>` (screenshot run PASS with `q=gmo`)
- `[x]` Pair 04: `/legacy/topic/<friendly>/<id>` vs `/topics/entry/<friendly>/<id>` (screenshot run PASS)
- `[x]` Pair 05: `/legacy/visualize/topic/<friendly>/<id>` vs `/visualize/topic/<friendly>/<id>` (route-level PASS; 200 on both sides)
- `[x]` Pair 06: `/legacy/groups/<friendly>/<id>` vs `/groups/<friendly>/<id>` (deterministic fixture screenshot run PASS; HTTP `200/200`)
- `[x]` Pair 07: `/legacy/groups/<friendly>/<id>/posts` vs `/groups/<friendly>/<id>/posts` (deterministic fixture screenshot run PASS; HTTP `200/200`)
- `[x]` Pair 08: `/legacy/groups/<friendly>/<id>/members` vs `/groups/<friendly>/<id>/members` (deterministic fixture screenshot run PASS; HTTP `200/200`)
- `[x]` Pair 09: `/legacy/members/<username>` vs `/members/<username>` (route-level PASS with `dsalunga`)
- `[x]` Pair 10: `/legacy/admin` legacy alias verified (intentional divergence): redirects to `/legacy/admin/db-backup` while modern admin remains `/admin`

## Exit Criteria for “Parity Complete”

- `[x]` All P0/P1 items above are completed or formally accepted as intentional divergences
- `[x]` Runtime verification matrix passes with evidence screenshots/notes
- `[x]` No unresolved legacy-only route without explicit product decision
- `[x]` QA scripts and active parity docs now reflect current root-modern (`/`) routing model (`/app/*` documented as alias only)

## Revalidation Notes (2026-05-15)

- `[x]` Provider visibility parity revalidated with concrete test coverage:
  - `tests/server/auth-social-session-callbacks.test.ts` verifies `/api/auth/providers` runtime availability flags.
  - `client/src/components/Auth/SocialLoginButtons.test.tsx` verifies frontend filtering by `enabledProviders`.
- `[x]` Legacy admin alias behavior revalidated with runtime test:
  - `tests/server/legacy-auth-account-admin-request-smoke.test.js` verifies `/legacy/admin?section=backup -> /legacy/admin/db-backup?section=backup`.
- `[x]` URL drift matrix tests revalidated and green after plan-path correction:
  - `tests/server/url-format-drift-runtime.test.js`
  - `tests/server/url-format-drift-approvals.test.js`
- `[x]` Link-entry and link-edit parity revalidated end-to-end:
  - Topic routes now support `topicLink` query context plus `PUT/DELETE /api/topics/links/:id`.
  - Argument routes now support `argumentLink` query context plus `PUT/DELETE /api/arguments/links/:id`.
  - Client coverage: `client/src/services/api.test.ts` validates query propagation and link mutation endpoint calls.
- `[x]` Forgot/reset flow parity revalidated with client integration tests:
  - `client/src/pages/Auth/forgotPasswordFlow.integration.test.tsx`
  - `client/src/pages/Auth/resetPasswordFlow.integration.test.tsx`
- `[x]` Members contributions + journal/sidebar parity revalidated:
  - API now returns per-entity contribution counters (`server/src/controllers/api/members.ts`) and modern tabs render these counters (`client/src/pages/Members/Profile/ProfileContributions.tsx`).
  - Modern sidebar now exposes member-route “In This Section” parity links and respects `topicLink`/`argumentLink` query context (`client/src/components/Layout/ContextSidebar.tsx`).
- `[x]` Admin parity revalidated for dashboard and operations:
  - Dashboard card coverage includes `administrators` and `groups` counts (`server/src/controllers/api/admin.ts`, `client/src/pages/Admin/AdminDashboard.tsx`, `client/src/pages/Admin/AdminPages.test.tsx`).
  - Runtime/admin operation coverage remains green in:
    - `tests/server/admin-db-backup-restore.test.ts`
    - `tests/server/api-endpoints-smoke.test.js`
    - `tests/server/parity-checklist.test.js`
- `[x]` Modern create flows now preserve more legacy-style context and redirect behavior:
  - Create pages now prefill context ids from route query params when available.
  - Successful create actions now redirect to the newly created entry route for `topic`, `argument`, `question`, `answer`, `issue`, `opinion`, and `artifact` entities instead of only returning to list pages.
- `[x]` Group route runtime matrix pairs pass through the deterministic temporary public fixture (`Pair 06-08`, HTTP `200/200` for each pair).

## Revalidation Notes (2026-07-11)

- `[x]` Search parity now uses MongoDB text relevance ordering with deterministic tie-breakers, preserves legacy argument sorting, and presents legacy `Facts` / `Comments` labels.
- `[x]` Entry-outline parity is centralized in the shared modern `EntryOutline` component and renders linked `Key topics` and `Key facts` sections.
- `[x]` Sidebar parity now restores legacy ordering and hierarchy: apps, contextual ancestry/siblings, related entries, journal categories, groups, explore categories, and personal shortcuts.
- `[x]` Focused client tests, server parity guardrails, TypeScript checks, and no-new-`any` checks pass for this parity group.
- `[x]` Topic create/edit restores contextual title, sources, parent, reference date, numeric tags, ethical-value flag, and icon persistence.
- `[x]` Fact create/edit restores type, parent support/opposition, reference date, numeric tags, ethical-value flag, and edit-mode loading; verdict selection remains in the dedicated moderation flow rather than being incorrectly required at creation.
- `[x]` Artifact create/edit restores inline file upload, type, parent, and numeric tags with bounded safe media storage and replacement behavior.
- `[x]` Question, answer, issue, opinion, and artifact edits now return to the updated entry; cancel actions return to the prior entry context.
- `[x]` Cross-entity comments preserve owner type, while comment replies preserve nested parent-comment context.
- `[x]` Group-scoped topic/fact/question/artifact creation is private and group-owned instead of leaking into public topic feeds.
- `[x]` Full server (`152` tests) and client (`135` tests) suites pass after form/action parity implementation.
- `[x]` Group runtime parity uses `scripts/qa/parity-group-fixture.mjs` to create and clean a marked temporary public group; the screenshot runner now covers entry/posts/members and rejects HTTP error pages.
- `[x]` Final screenshot matrix at `docs/qa/artifacts/parity-screenshots-2026-07-11-final/manifest.json` recorded `200/200` for all 11 modern/legacy pairs and left zero fixture records.
- `[x]` Legacy group overview/posts compatibility was updated from obsolete callback calls to Promise-based utilities and current `groupId` ownership filters.
