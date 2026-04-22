# Page-by-Page Legacy vs Modern Comparison Checklists (2026-04-22)

## Universal Comparison Dimensions (Apply to Every Page)

For each page pair, compare all items below:

- Route and redirect behavior
- Page shell and structural sections
- Core UI elements (forms, cards, lists, tabs, menus, metadata)
- Common shell elements (top nav, sidebar, account menus, breadcrumbs, page-action bars)
- Element placement/hierarchy (position/order of controls and key content blocks)
- Visual parity baseline (spacing, typography scale, button/link states, contrast/readability)
- Primary and secondary user actions
- API contract and payload shape used by the page
- Role/permission gating and visibility rules
- Empty/loading/error states
- Sorting/filtering/pagination behavior
- Mobile/responsive behavior
- Accessibility baseline (focus behavior, labels, keyboard paths)
- SEO/meta behavior for indexable pages (title, canonical, social tags)
- Analytics/monitoring hooks (page tracking and interaction instrumentation)

## 1) Global Shell and Navigation

Pair:
- Legacy: `legacy/templates/dust/layouts/master.dust`, `legacy/templates/dust/layouts/header.dust`, `legacy/templates/jade/layouts/*.jade`
- Modern: `client/src/components/Layout/Layout.tsx`, `client/src/components/Layout/Header.tsx`, `client/src/components/Layout/ContextSidebar.tsx`

Checklist:
- [x] Header brand and top-level navigation parity (`Explore`, `Search`, menu groups).
- [x] Runtime verify signed-in account menu parity baseline (profile, journal, role switch, sign out) for `reader`/`contributor` roles.
- [x] Sidebar contextual sections parity (`Apps`, `Explore`, `In This Section`, `Related`).
- [x] Runtime verify breadcrumb container and label behavior parity across all core entry/detail page families (topic/argument/question/answer/issue/opinion/artifact).
- [x] Runtime verify page-action bar/menu placement parity across all core entry/detail page families.
- [ ] Verify exact placement order parity for primary action groups across topic/argument/question/issue/opinion entry pages.
- [x] Mobile nav + sidebar toggles parity.
- [ ] Verify ordering/hierarchy parity of sidebar items per route family.
- [ ] Runtime verify style parity baseline for common elements (link/button states, spacing rhythm, typography sizing, active/selected styles); focus-state parity is done, hover/active/expanded still pending final sign-off.
- [x] Legacy link-prefix containment checks for `/legacy/*` pages.
- [x] Runtime baseline capture complete for shell-level top nav/sidebar parity (home/explore/admin) plus dynamic topic-entry pair; summary: `docs/qa/LEGACY_MODERN_RUNTIME_EVIDENCE_SUMMARY_2026-04-22.md`.

## 2) Home

Pair:
- Legacy: `/legacy/` -> `legacy/templates/dust/index.dust`
- Modern: `/` -> `client/src/pages/HomePage.tsx`

Checklist:
- [x] Hero/jumbotron area and CTA parity.
- [x] Feature-card sections parity.
- [x] Mixed latest feed parity across entity types.
- [x] Legacy `entrySet` ordering parity in modern feed.
- [x] `View more` navigation parity.
- [ ] Validate fixture-level ordering and card density in runtime screenshots.

## 3) Explore

Pair:
- Legacy: `/legacy/explore` -> `legacy/templates/dust/wiki/explore.dust`
- Modern: `/explore` -> `client/src/pages/ExplorePage.tsx`

Checklist:
- [x] Category tile grid parity.
- [x] Subtopic/subargument preview parity.
- [x] Latest-post tabs parity by entity type.
- [x] Filter controls parity (screening/verdict/relationship/tag).
- [x] Sort semantics parity (`latest`/`popular`).
- [ ] Runtime verify tab-to-query contract and pagination behavior with shared fixture data.

## 4) Search

Pair:
- Legacy: `/legacy/search` -> `legacy/templates/dust/search.dust`
- Modern: `/search` -> `client/src/pages/SearchPage.tsx`

Checklist:
- [x] Search input/submit parity.
- [x] Scope controls parity (`all/wiki/journal` with legacy diary alias compatibility).
- [x] Tab bucket parity (topics/facts/questions/issues/opinions/answers/artifacts).
- [x] Empty-state parity.
- [x] Keyboard navigation enhancements present in modern.
- [ ] Runtime verify ordering/paging parity for equivalent query fixtures.

## 5) Entry Detail Pages (Topic/Argument/Question/Issue/Opinion/Answer/Artifact)

Pairs:
- Legacy:
  - Topic: `legacy/templates/dust/wiki/topics/entry.dust`
  - Argument: `legacy/templates/dust/wiki/arguments/entry.dust`
  - Question: `legacy/templates/dust/wiki/questions/entry.dust`
  - Issue: `legacy/templates/dust/wiki/issues/entry.dust`
  - Opinion: `legacy/templates/dust/wiki/opinions/entry.dust`
  - Answer: `legacy/templates/dust/wiki/answers/entry.dust`
  - Artifact: `legacy/templates/dust/wiki/artifacts/entry.dust`
- Modern:
  - `client/src/pages/*EntryPage.tsx`

Checklist:
- [x] Runtime verify header/breadcrumb parity across all core entity families (topic/argument/question/answer/issue/opinion/artifact).
- [ ] Runtime verify quick actions and actions-menu parity (edit/follow/share/reply/link/details/history/report/signal/appeal/screening/convert/delete per role) across all entity families; `reader`/`contributor` baseline is done, privileged-role parity (`screener`/`reviewer`/`admin`) is still pending.
- [x] Tab sections parity with counts.
- [x] Child lists parity (topics/facts/questions/artifacts/issues/comments etc.).
- [x] Key entries sections parity (key topics/key arguments where applicable).
- [ ] Runtime verify `entry-outline` interaction parity (legacy include: `legacy/templates/dust/wiki/common/entry-outline.dust`).
- [ ] Runtime verify link-entry/link-edit subflows parity for topic-link and argument-link entities.
- [x] Runtime comparability baseline restored for topic-entry route using dynamic live fixture in walkthrough/screenshots.

## 6) Create/Edit Flows by Entity

Pairs:
- Legacy: `legacy/templates/dust/wiki/*/create.dust` and legacy edit routes
- Modern:
  - Topics: `TopicCreatePage.tsx`
  - Arguments: `ArgumentCreatePage.tsx`
  - Questions: `QuestionCreatePage.tsx`, `QuestionEditPage.tsx`
  - Issues: `IssueCreatePage.tsx`, `IssueEditPage.tsx`
  - Opinions: `OpinionCreatePage.tsx`, `OpinionEditPage.tsx`
  - Answers: `AnswerCreatePage.tsx`, `AnswerEditPage.tsx`
  - Artifacts: `ArtifactCreatePage.tsx`, `ArtifactEditPage.tsx`

Checklist:
- [x] Create/list/detail route presence for all entity families.
- [ ] Field-by-field form parity per entity (required fields, defaults, hidden/system fields, help text).
- [ ] Validation parity (required/format/length/ownership errors).
- [ ] Post-submit redirect parity and toast/message parity.
- [ ] Draft/edit-mode behavior parity where legacy supports edit-in-create workflows.

## 7) Visualize

Pair:
- Legacy: `/legacy/visualize*` -> `legacy/templates/dust/wiki/visualize.dust`
- Modern: `/visualize*` -> `client/src/pages/VisualizePage.tsx`

Checklist:
- [x] Graph rendering parity.
- [x] Drag and physics parity with tuned momentum behavior.
- [x] Fullscreen and selected-node action parity.
- [x] Node-driven navigation parity to entry pages.
- [x] Fullscreen preference persistence parity.
- [ ] Runtime verify large-graph performance parity and interaction smoothness under equivalent data volume.

## 8) Authentication and Account

Pairs:
- Legacy:
  - Login: `legacy/templates/jade/login/index.jade`
  - Signup: `legacy/templates/jade/signup/index.jade`
  - Forgot/reset: `legacy/templates/jade/login/forgot/index.jade`, `legacy/templates/jade/login/reset/index.jade`
  - Account settings: `legacy/templates/jade/account/settings/index.jade`
- Modern:
  - `LoginPage.tsx`, `SignupPage.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`, `FastSwitchPage.tsx`, `SettingsPage.tsx`

Checklist:
- [x] Login/signup/forgot/reset route presence parity.
- [x] Fast-switch flow parity.
- [x] Social-auth button surface parity.
- [ ] Runtime verify provider visibility parity against backend provider config.
- [ ] Runtime verify forgot/reset token end-to-end parity from email link to completion.
- [ ] Compare auth failure/retry/error messaging parity.

## 9) Members and Profile

Pairs:
- Legacy: `legacy/templates/dust/members/**`
- Modern: `client/src/pages/Members/**`

Checklist:
- [x] Members index and role list pages parity.
- [x] Profile overview/topics/following/pages/settings route parity.
- [x] Journal terminology migration with legacy diary aliases retained.
- [x] Non-owner follow action implemented in modern.
- [ ] Runtime verify contributions tab/filter/counter parity with legacy behavior.
- [ ] Runtime verify journal context sidebar parity for all profile/journal states.

## 10) Groups

Pairs:
- Legacy: `legacy/templates/dust/groups/**`
- Modern: `client/src/pages/Groups/**`

Checklist:
- [x] Group list/create/details/posts/members route parity.
- [x] Group overview parity improvements (stats).
- [x] Members segmentation parity improvements (admins vs all members).
- [ ] Runtime verify friendly-vs-id canonicalization behavior across deep links.
- [ ] Runtime verify join/leave/edit action parity by role.

## 11) Admin

Pairs:
- Legacy: `legacy/templates/jade/admin/**`, `legacy/templates/dust/admin/db-backup.dust`, `legacy/templates/dust/wiki/verdict/update.dust`
- Modern: `client/src/pages/Admin/**`

Checklist:
- [x] Dashboard + users/accounts/admins/groups/categories/statuses pages parity at route/component level.
- [x] Verdict pages parity via redirected/modernized flow.
- [x] Admin moderation signals and audit timeline modern surfaces present.
- [ ] Runtime verify dashboard stat-card parity coverage.
- [ ] Runtime verify backup/restore mutation parity and operator confirmations.
- [ ] Runtime verify high-risk admin mutation parity (detail edits and saves).

## 12) Utility and Secondary Flows

Pairs:
- Legacy: `legacy/templates/dust/wiki/clipboard.dust`, `legacy/templates/dust/wiki/outline/link-to.dust`, `legacy/templates/dust/wiki/screening.dust`, `legacy/templates/dust/wiki/convert.dust`, `legacy/templates/dust/wiki/related.dust`
- Modern: `ClipboardPage.tsx`, `OutlineLinkPage.tsx`, `ScreeningPage.tsx`, `ConvertPage.tsx`, redirect aliases in `server/src/middlewares/routes.ts`

Checklist:
- [x] Clipboard parity route exists.
- [x] Outline link parity route exists with legacy create alias handling.
- [x] Screening and convert parity routes exist.
- [x] Related flow alias behavior exists (query-target to modern entry/explore fallback).
- [ ] Runtime verify edge-case query fallback behavior for related/outline/verdict alias routes.

## 13) Static and Informational Pages

Pairs:
- Legacy: `legacy/templates/dust/about/page.dust`, `legacy/templates/jade/contact/index.jade`, `legacy/templates/dust/help-us.dust`, `legacy/templates/dust/install/index.dust`
- Modern: `AboutPage.tsx`, `ContactPage.tsx`, `HelpUsPage.tsx`, `InstallPage.tsx`

Checklist:
- [x] Route and page presence parity.
- [x] Contact form API integration parity.
- [ ] Runtime verify content/copy structure parity and CTA destinations.
- [ ] Runtime verify SEO/meta tags parity or documented intentional differences.

## 14) Error Pages

Pairs:
- Legacy: `legacy/templates/jade/http/404.jade`, `legacy/templates/jade/http/500.jade`, `legacy/templates/dust/errors/503.dust`
- Modern: `NotFoundPage.tsx`, `ServerError500.tsx`, `ServiceUnavailable503.tsx`

Checklist:
- [x] Explicit modern error routes exist (`/500`, `/503`, wildcard not-found).
- [ ] Runtime verify server-side fault paths map to modern error rendering contracts where intended.

## 15) Modern-Only Surfaces (Intentional)

Pages:
- `/notifications` (`NotificationsPage.tsx`)
- `/timeline` (`EntryTimelinePage.tsx`)
- `/create` (`CreateWizardPage.tsx`)
- `/admin/audit` (`AuditTimelinePage.tsx`)
- `/admin/moderation/signals` (`SignalsAppealsPage.tsx`)

Checklist:
- [x] Marked as intentional modern-only features.
- [ ] Ensure no legacy parity requirement is incorrectly attached to these pages.

## 16) Open Decision Items

- [ ] Discuss family migration decision:
  - legacy pages: `legacy/templates/dust/discuss/index.dust`, `topic.dust`, `category.dust`
  - decide: migrate to modern routes, alias into existing surfaces, or formally retire.
- [ ] Formal sign-off criteria for “fully migrated” status per page family.
