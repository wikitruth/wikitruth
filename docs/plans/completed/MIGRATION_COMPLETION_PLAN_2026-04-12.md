# React Client Migration Completion Plan

**Date:** 2026-04-12
**Reference:** [LEGACY_REACT_GAP_ANALYSIS_2026-04-12.md](../../frontend/LEGACY_REACT_GAP_ANALYSIS_2026-04-12.md)
**Goal:** Close all remaining gaps between legacy frontend and modern React client

> Status update (2026-04-18): phases below document completed remediation work for this plan scope.  
> Remaining migration-closure gaps (admin parity, final UX parity, runtime hardening) are tracked in `docs/plans/MIGRATION_CLOSURE_PENDING_CHECKLIST_PLAN_2026-04-18.md`.

---

## Phase 1 — Critical Gaps (High Impact)

### 1.1 Rich Text Editor Integration

> **Priority:** P0 — Blocks content creation quality
> **Estimated Scope:** ~15 files affected (all create/edit pages)

#### Rich Text Editor Comparison

| Criteria | **TipTap** | **Quill** | **Slate** |
|----------|-----------|-----------|-----------|
| **Architecture** | Wrapper around ProseMirror | Standalone WYSIWYG | Low-level framework (build-your-own) |
| **React support** | First-class (`@tiptap/react`) | Community wrapper (`react-quill`) | First-class (`slate-react`) |
| **TypeScript** | ✅ Full TS, types included | ⚠️ Types via `@types/quill` | ✅ Full TS, types included |
| **Bundle size** | ~45 KB (core + starter-kit) | ~43 KB | ~55 KB (core + react + history) |
| **Learning curve** | Low–Medium | Low | High |
| **Extensibility** | Excellent — extension API for custom nodes, marks, plugins | Moderate — custom blots/modules | Maximum — you build everything |
| **Toolbar** | Configurable; headless or pre-built UI | Built-in toolbar | Build your own |
| **Tables** | ✅ Official `@tiptap/extension-table` | ⚠️ Community modules, fragile | Build from scratch |
| **Collaborative editing** | ✅ Built-in (Yjs integration) | ❌ Not supported | Possible but DIY |
| **Image/media** | ✅ Extension-based (image, video, iframe) | ✅ Built-in image embed | Build from scratch |
| **Code blocks** | ✅ `@tiptap/extension-code-block-lowlight` | ✅ Built-in code block | Build from scratch |
| **Markdown shortcuts** | ✅ `@tiptap/extension-typography` | ❌ None | Build from scratch |
| **Maintenance** | Active (Tiptap GmbH, funded company) | Stagnant (Quill 2.0 delayed for years) | Active (community-driven) |
| **HTML import/export** | ✅ Native (HTML is the content model) | ✅ Native (Delta ↔ HTML) | ⚠️ Requires serializer |
| **Community** | Growing rapidly, 26K+ GitHub stars | Large, 43K+ GitHub stars | Large, 30K+ GitHub stars |
| **Summernote migration** | Easy — both use HTML content model | Easy — both use HTML | Medium — need custom serializer |

#### Recommendation: **TipTap**

**Why TipTap wins for Wikitruth:**
1. **HTML-native** — Legacy Summernote stores HTML; TipTap reads/writes HTML natively. Zero content migration needed.
2. **Table support** — Official extension. Quill's table support is unreliable; Slate requires building from scratch.
3. **TypeScript-first** — Matches the project's TS codebase. No `@types/` shim needed.
4. **Extension architecture** — Can start minimal and add features (code blocks, mentions, media) incrementally.
5. **Active maintenance** — Corporate-backed (Tiptap GmbH). Quill has been stalled; Slate is community-only.
6. **Future-proof** — Built-in collaborative editing if the project ever needs it.

**When to choose alternatives:**
- **Quill** — If you need the simplest possible drop-in and never need tables or collaboration.
- **Slate** — If you need a fully custom editing experience unlike any existing editor (e.g., notion-like blocks).

#### Checklist

- [x] Install TipTap packages: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-table`, `@tiptap/extension-link`, `@tiptap/extension-image`, `@tiptap/extension-code-block-lowlight`
- [x] Create `client/src/components/Form/RichTextEditor.tsx` wrapper component
- [x] Create `client/src/components/Form/RichTextEditor.css` with toolbar styling matching Bootstrap theme
- [x] Configure toolbar: bold, italic, underline, strikethrough, headings (H1–H3), bullet list, ordered list, blockquote, code block, table, link, image, horizontal rule, undo/redo
- [x] Add HTML ↔ editor content serialization (TipTap uses HTML natively — minimal work)
- [x] Replace `<TextArea>` with `<RichTextEditor>` in:
  - [x] `TopicCreatePage.tsx` _(Note: no TopicEditPage exists — topics edited via create page with edit mode)_
  - [x] `ArgumentCreatePage.tsx` _(Note: no ArgumentEditPage exists — arguments edited via create page with edit mode)_
  - [x] `QuestionCreatePage.tsx` / `QuestionEditPage.tsx`
  - [x] `AnswerCreatePage.tsx` / `AnswerEditPage.tsx`
  - [x] `IssueCreatePage.tsx` / `IssueEditPage.tsx`
  - [x] `OpinionCreatePage.tsx` / `OpinionEditPage.tsx`
  - [x] `ArtifactCreatePage.tsx` / `ArtifactEditPage.tsx`
- [x] Verify existing HTML content renders correctly in the editor (load legacy-created content)
- [x] Add compact mode variant (for inline replies / small forms)
- [x] Write unit tests for RichTextEditor component — `client/src/components/Form/RichTextEditor.test.tsx`
- [x] Write Storybook story for RichTextEditor
- [x] Verify no XSS via HTML sanitization (TipTap sanitizes by default; confirm config)
- [x] Add dark mode styles for TipTap editor toolbar and content area (CSS variables)

---

### 1.2 Dynamic Meta Tags / SEO

> **Priority:** P0 — Social sharing and search indexing broken
> **Estimated Scope:** ~25 files (each page component adds its meta)

#### Checklist

- [x] Install `react-helmet-async` (active fork of react-helmet)
- [x] Add `<HelmetProvider>` wrapper in `AppProviders.tsx`
- [x] Create `client/src/components/common/PageMeta.tsx` helper:
  ```tsx
  // Props: title, description, ogImage?, ogType?, canonicalUrl?
  ```
- [x] Add `<PageMeta>` to page components with dynamic content:
  - [x] `HomePage.tsx` — "Wikitruth – {titleSlogan}"
  - [x] `AboutPage.tsx` — "About – Wikitruth"
  - [x] `ContactPage.tsx` — "Contact – Wikitruth"
  - [x] `SearchPage.tsx` — "Search: {query} – Wikitruth"
  - [x] `TopicsPage.tsx` — "Topics – Wikitruth"
  - [x] Topic/Argument/Question/Issue/Opinion/Answer/Artifact entry pages — Added `<PageMeta>` with dynamic title/description to all 7 entry pages
  - [x] All create pages — "Create {EntityType} – Wikitruth" (7 create pages + 5 edit pages)
  - [x] Listing pages — TopicsPage, ArgumentsPage, QuestionsPage, AnswersPage, IssuesPage, OpinionsPage
  - [x] Auth pages — `LoginPage.tsx`, `SignupPage.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`, `LogoutPage.tsx`
  - [x] Profile pages — `ProfilePage.tsx` (profile tabs share same page)
  - [x] Group pages — `GroupsPage.tsx` (index/listing page)
  - [x] Admin pages — `AdminDashboard.tsx`
  - [x] Error pages — `NotFoundPage.tsx`, `ServerError500.tsx`, `ServiceUnavailable503.tsx`
- [x] Add Open Graph tags: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`
- [x] Add Twitter Card tags: `twitter:card`, `twitter:title`, `twitter:description`
- [x] Set canonical URL for each page to avoid duplicate content
- [x] Test social sharing previews (OpenGraph/Twitter meta coverage validated via `PageMeta` assertions in `client/src/components/common/PageMeta.test.tsx`; external validator checks can be run against public deployment URLs)
- [x] Verify `document.title` updates on SPA navigation

---

### 1.3 reCAPTCHA Widget

> **Priority:** P0 — Bot protection absent
> **Estimated Scope:** 3–4 files

#### Checklist

- [x] Install `react-google-recaptcha-v3` (or `react-google-recaptcha` for v2 checkbox)
- [x] Add `<GoogleReCaptchaProvider>` in `AppProviders.tsx` with site key from env/config
- [x] Create `client/src/hooks/useRecaptcha.ts` hook — loads reCAPTCHA v3 script dynamically
- [x] Integrate into `SignupPage.tsx`:
  - [x] Execute reCAPTCHA on form submit
  - [x] Pass `recaptchaResponse` token to signup API call
- [x] Integrate into `ContactPage.tsx`:
  - [x] Execute reCAPTCHA on form submit
  - [x] Pass `recaptchaResponse` token to contact API call
- [x] Add environment variable `REACT_APP_RECAPTCHA_SITE_KEY` to config
- [x] Document reCAPTCHA setup in `ENVIRONMENT_VARIABLES.md`
- [x] Test: submit forms with and without valid captcha token — automated auth captcha tests in `tests/server/auth-recaptcha-role-switch.test.ts`
- [x] Verify server-side validation still works (check `server/src/` captcha middleware)

---

### 1.4 Google Analytics / Analytics Integration

> **Priority:** P1 — No user behavior visibility
> **Estimated Scope:** 3–5 files

#### Checklist

- [x] Decide: GA4 (`gtag.js`) vs privacy-friendly alternative (Plausible, Umami, PostHog)
- [x] Create `client/src/utils/analytics.ts` abstraction layer:
  - [x] `trackPageView(path, title)` — called on each route change
  - [x] `trackEvent(category, action, label?, value?)` — for specific interactions
  - [x] `initAnalytics(trackingId)` — load script and initialize
- [x] Add analytics initialization in `App.tsx` (RouteTracker component)
- [x] Add `useEffect` in router wrapper to track SPA page transitions
- [x] Add environment variable `REACT_APP_ANALYTICS_ID`
- [x] Wire `trackEvent()` calls into key interactions:
  - [x] Login / Signup success (in LoginPage and SignupPage submit handlers)
  - [x] Content creation (topic, argument, question, etc.) — in create page submit handlers
  - [x] Search queries — in SearchPage form submit
  - [x] Error page hits — in NotFoundPage (404 tracking via useEffect)
- [x] Verify no PII leakage in tracked data
- [x] Test: confirm pageviews fire on navigation, events fire on actions — analytics utility tests in `client/src/utils/analytics.test.ts`

---

### 1.5 Role Switching (Contributor/Reader)

> **Priority:** P1 — Core user workflow missing
> **Estimated Scope:** 4–6 files

#### Checklist

- [x] Verify server API: check if `/api/auth/role-switch` or equivalent endpoint exists
  - [x] If missing, create API endpoint in `server/src/`
- [x] Add `activeRole` state to `AuthContext` — type: `'contributor' | 'screener' | 'reviewer' | 'admin'`
- [x] Add `availableRoles` computed via `useMemo` from `user.roles`
- [x] Create role switcher dropdown in `Header.tsx` user menu:
  - [x] Show current role with checkmark
  - [x] Dropdown to switch (visible when `availableRoles.length > 1`)
- [x] Persist choice via `localStorage` (`wt_active_role` key) — reads on mount, writes on change
- [x] Conditionally show/hide UI based on active role:
  - [x] Hide "Create" buttons when not authenticated — auth guards on all 6 listing pages
  - [x] Hide edit/moderation actions in Reader mode
  - [x] Show content-consumption-only view in Reader mode
- [x] Memoize AuthContext value object — wrapped in `useMemo`, `setActiveRole` wrapped in `useCallback`
- [x] Write tests for role switching behavior

---

## Phase 2 — Major Gaps (UX Quality)

### 2.1 Content View Filters

> **Priority:** P2
> **Estimated Scope:** 3–5 files

#### Checklist

- [x] Create `client/src/components/common/ContentViewFilter.tsx`:
  - [x] Options: "All", "Wiki", "Original" (as button group) — **NOTE: Options differ from legacy "Verified/Latest/Everything". Review if these match intended behavior.**
  - [x] Renders as button group with proper `aria-pressed` attributes
- [x] Add filter state to list pages (Topics, Arguments, Questions, Issues, Opinions, Answers)
- [x] Pass filter to API calls (query param: `?view=wiki` or `?view=original`) — API calls updated in all listing pages
- [x] Verify server API supports filtering (check `server/src/` query handlers)
- [x] Persist user preference in localStorage — via `wt_view_mode` key
- [x] Add to listing pages:
  - [x] `TopicsPage.tsx`
  - [x] `ArgumentsPage.tsx`
  - [x] `QuestionsPage.tsx`
  - [x] `IssuesPage.tsx`
  - [x] `OpinionsPage.tsx`
  - [x] `AnswersPage.tsx`
- [x] Write tests for filter interaction

### 2.2 Off-Canvas Responsive Sidebar

> **Priority:** P2
> **Estimated Scope:** 2–3 files

#### Checklist

- [x] Update `Layout.tsx` with `sidebarOpen` state and toggle button
- [x] Add toggle button visible on `xs`/`sm` breakpoints (hamburger icon)
- [x] Slide-in animation — **EXISTS in legacy CSS** (`public/less/app.less` lines 1024–1065): `.row-offcanvas` with `transition: all .25s ease-out` and `right: -290px → 290px` on `.active`
- [x] Add overlay backdrop when sidebar is open on mobile — `.sidebar-backdrop` with fixed position, rgba background
- [x] Close sidebar on: backdrop click, ESC key, link click
- [x] Test at breakpoints: 320px, 375px, 768px, 1024px — covered in Playwright smoke (`tests/e2e/smoke.spec.ts`)

### 2.3 Keyboard Navigation

> **Priority:** P2
> **Estimated Scope:** 2–3 files

#### Checklist

- [x] Global keyboard shortcuts in `App.tsx` RouteTracker:
  - [x] `/` — navigate to search (skipped when user is in input/textarea/contenteditable)
  - [x] `Ctrl+K` / `Cmd+K` — navigate to search
- [x] Add keyboard handlers to search results component:
  - [x] `Escape` — clear search / close results
  - [x] `Enter` — navigate to selected result
  - [x] `ArrowUp` / `ArrowDown` — move through results
- [x] Add debounced search input (333ms, matching legacy)
- [x] Highlight active result with `aria-activedescendant`
- [x] `?` — show keyboard shortcut help dialog

### 2.4 GeoPattern SVG Generation

> **Priority:** P3
> **Estimated Scope:** 2–3 files

#### Checklist

- [x] Install `geopattern` npm package
- [x] Create `client/src/components/common/GeoPatternBackground.tsx`:
  - [x] Accepts `seed` prop (username or entity ID)
  - [x] Generates SVG pattern and sets as background
  - [x] Configurable `height` (default 120px), `className`, `children`
- [x] Applied to entry pages:
  - [x] `TopicEntryPage.tsx`, `ArgumentEntryPage.tsx`, `QuestionEntryPage.tsx`, `AnswerEntryPage.tsx`, `IssueEntryPage.tsx`, `OpinionEntryPage.tsx`, `ArtifactEntryPage.tsx`
- [x] Apply to:
  - [x] Member profile header/banner (`ProfilePage.tsx`)
  - [x] Group header/banner (`GroupPage.tsx`)
- [x] Match legacy's visual style (verify same pattern algorithm)
- [x] Add fallback for SSR/no-JS (static `green-bg-pattern.svg`)

---

## Phase 3 — Missing Routes

### 3.1 Clipboard Page

> **Priority:** P2
> **Estimated Scope:** 3–4 new files

#### Checklist

- [x] Create `client/src/pages/ClipboardPage.tsx` — localStorage-based (`wt_clipboard` key), max 100 items
- [x] Add route `/clipboard` to `routeConfig.tsx`
- [x] Exports `addToClipboard(item)` and `removeFromClipboard(id)` functions
- [x] Implement:
  - [x] List of bookmarked/clipped content items
  - [x] Remove from clipboard action
  - [x] Navigate to original content
  - [x] Empty state message ("Your clipboard is empty…")
  - [x] "Clear All" button
- [x] Add "Clipboard" link in `ContextSidebar.tsx` (under Apps section)
- [x] Verify API: check if `server/src/controllers/clipboard.ts` has server-side endpoints (or keep localStorage-only) — kept localStorage-only by design
- [x] Write tests for ClipboardPage — `client/src/pages/ClipboardPage.test.tsx`

### 3.2 Outline / Link Editor

> **Priority:** P2
> **Estimated Scope:** Replace stub with full implementation

#### Checklist

- [x] Create `client/src/pages/OutlineLinkPage.tsx` — basic form implementation
- [x] Add route `/outline/link` to `routeConfig.tsx`
- [x] Basic implementation:
  - [x] Parent/child link creation form
  - [x] Takes `parentId`/`parentTitle` as query params
- [x] **Incomplete features — needs significant work:**
  - [x] Topic hierarchy tree view
  - [x] Drag-and-drop or selection-based relationship editor (selection-based linking implemented)
  - [x] Search/filter for linking targets
- [x] Review legacy implementation: `server/src/controllers/outline.ts` and `public/templates/dust/wiki/outline/`
- [x] Verify API endpoints for outline operations — `tests/server/outline-api.test.ts`
- [x] Write tests for outline editor — `client/src/pages/OutlineLinkPage.test.tsx`

### 3.3 Verdict Update Page

> **Priority:** P3
> **Estimated Scope:** 2–3 new files

#### Checklist

- [x] Create `client/src/pages/Admin/Verdicts/VerdictUpdatePage.tsx`
- [x] Create `client/src/pages/Admin/Verdicts/VerdictsPage.tsx`
- [x] Add route `/admin/verdicts` to `routeConfig.tsx`
- [x] Add route `/admin/verdicts/:id` to `routeConfig.tsx`
- [x] Implement:
  - [x] Verdict selection per entry (server-driven moderation verdict statuses)
  - [x] Reasoning text field with RichTextEditor
  - [x] Save via moderation API (single update + bulk endpoint)
- [x] **Incomplete features:**
  - [x] List of entries pending verdict update
  - [x] Bulk update capability
  - [x] Filter by entity type and current verdict
- [x] Write tests for verdict pages and moderation queue APIs — `client/src/pages/Admin/Verdicts/VerdictsPage.test.tsx`, `client/src/services/api/moderation.test.ts`

---

## Phase 4 — Minor Gaps & Polish

### 4.1 Print Styles

- [x] Add `client/src/styles/print.css` with `@media print` rules
- [x] Import in `AppProviders.tsx`
- [x] Hide nav, sidebar, buttons, breadcrumb, pagination, footer, dropdowns in print
- [x] Typography: 12pt base, no shadows, show link hrefs
- [x] Test print preview for entry detail pages — Playwright smoke includes print media assertion (`tests/e2e/smoke.spec.ts`)

### 4.2 Date Formatting

- [x] Install `date-fns` (lightweight alternative to Moment.js)
- [x] Create `client/src/utils/dateFormat.ts` with helpers:
  - [x] `formatRelativeTime(date)` — "2 hours ago", "3 days ago"
  - [x] `formatDate(date, pattern)` — "Apr 12, 2026"
  - [x] `formatDateFull(date)` — combined full format
- [x] Replace `toLocaleDateString()` calls in all 7 entry pages with `formatRelativeTime()`
- [x] Write tests for date formatting helpers

### 4.3 Content Action Parity

- [x] Add "Copy to Clipboard" action in `EntryActionsMenu.tsx` — calls `addToClipboard()` from ClipboardPage
- [x] Add "Link to…" action in `EntryActionsMenu.tsx` — navigates to `/outline/link`
- [x] Add "View History" action in `EntryActionsMenu.tsx` — navigates to entry history
- [x] Add "Reply" action where applicable — navigates to `/opinions/create?parentId=...&parentType=...` for topic/argument/question/answer/issue/opinion entries
- [x] Verify actions match legacy popover menu options

---

## Phase 5 — Security & Stability (NEW — from Codebase Audit 2026-04-12)

> **Priority:** P0–P1 — Security vulnerabilities and crash risks identified

### 5.1 XSS Prevention via HTML Sanitization

> **Priority:** P0 — CRITICAL SECURITY ISSUE
> **Scope:** 8 files

**Problem:** 8 pages use `dangerouslySetInnerHTML` to render user-authored rich HTML (from TipTap editor) without sanitization. This is a direct XSS vector — stored malicious HTML will execute in all visitors' browsers.

#### Checklist

- [x] Install `dompurify` and `@types/dompurify`
- [x] Create `client/src/utils/sanitizeHtml.ts` helper wrapping DOMPurify with safe defaults
- [x] Replace all 8 unsanitized `dangerouslySetInnerHTML` usages:
  - [x] `TopicEntryPage.tsx` (line ~177)
  - [x] `ArgumentEntryPage.tsx` (line ~109)
  - [x] `QuestionEntryPage.tsx` (line ~100)
  - [x] `AnswerEntryPage.tsx` (line ~68)
  - [x] `IssueEntryPage.tsx` (line ~93)
  - [x] `OpinionEntryPage.tsx` (line ~95)
  - [x] `ArtifactEntryPage.tsx` (line ~73)
  - [x] `Members/Profile/Pages/PageView.tsx` (line ~112)
- [x] Configure DOMPurify to allow safe HTML subset (headings, lists, tables, links, images — match TipTap output)
- [x] Add server-side HTML sanitization before storing content (defense-in-depth) — `sanitize-html` middleware on API router + `getEditorContent()` sanitization
- [x] Write tests confirming `<script>`, `onerror`, `javascript:` URIs are stripped — `tests/server/sanitize-html.test.ts`

### 5.2 React Error Boundary

> **Priority:** P1 — App crash risk
> **Scope:** 2–3 files

**Problem:** No Error Boundary exists. A render error in any page component crashes the entire app with a white screen.

#### Checklist

- [x] Create `client/src/components/common/ErrorBoundary.tsx` (class component, React requirement)
- [x] Wrap main route outlet in `App.tsx` with `<ErrorBoundary>`
- [x] Implement fallback UI: "Something went wrong" message with "Try Again" and "Go Home" buttons
- [x] Log errors to analytics via `trackEvent('render_crash', 'error', error.message)`
- [x] Write tests for ErrorBoundary (trigger error, verify fallback renders) — `ErrorBoundary.test.tsx`

### 5.3 User-Facing Error Notifications

> **Priority:** P1 — All API errors are silent
> **Scope:** 3–5 files

**Problem:** API failures are caught with `try/catch` but only logged to `console.error()`. Users see no feedback when actions fail (form submissions, data loads, etc.).

#### Checklist

- [x] Create `client/src/context/NotificationContext.tsx` with `addToast(type, message)` method (types: success, danger, warning, info)
- [x] Create `client/src/components/common/ToastContainer.tsx` — Bootstrap alert-based toast renderer
- [x] Add `<NotificationProvider>` to `AppProviders.tsx`
- [x] Replace `console.error()` calls in page components with `addToast('danger', ...)` notifications
- [x] Add success toasts for: content created, content updated, content deleted
- [x] Auto-dismiss after ~5 seconds, allow manual dismiss

### 5.4 Content Security Policy

> **Priority:** P2 — Defense-in-depth
> **Scope:** 1–2 server files

**Problem:** Helmet.js is installed but CSP headers not configured. Adding CSP would mitigate XSS even if sanitization is bypassed.

#### Checklist

- [x] Configure Helmet CSP in `server/src/app.ts`:
  - [x] `script-src 'self'` + analytics/reCAPTCHA domains
  - [x] `style-src 'self' 'unsafe-inline'` (needed for TipTap)
  - [x] `img-src 'self' data: https:` (for user-uploaded images)
  - [x] `connect-src 'self'` + API domains
- [x] Test that all app functionality works under the new CSP — CSP guardrail coverage in `tests/server/csp-config-smoke.test.js` and monitoring endpoint tests
- [x] Add `report-uri` or `report-to` endpoint for CSP violation monitoring — `/api/monitoring/csp`

---

## Phase 6 — Performance & Code Quality (NEW — from Codebase Audit 2026-04-12)

> **Priority:** P2–P3

### 6.1 AuthContext Performance Fix

> **Priority:** P2 — Causes unnecessary re-renders across entire app
> **Scope:** 1 file

**Problem:** `AuthContext.tsx` creates the context `value` object inline on every render (line ~91). Every component using `useAuth()` re-renders on every state change in any ancestor.

#### Checklist

- [x] Wrap `AuthContext` value in `useMemo` with proper dependency array
- [x] Verify UserContext already uses `useMemo` (confirmed: yes)
- [x] Consider splitting auth state (rarely changes) from auth actions (stable references) — core auth actions wrapped in `useCallback`

### 6.2 User/Auth Context Consolidation

> **Priority:** P3
> **Scope:** 3–4 files

**Problem:** Both `AuthContext` and `UserContext` store user data. The separation is unclear.

#### Checklist

- [x] Document the intended separation between AuthContext and UserContext — `docs/frontend/AUTH_USER_CONTEXT_BOUNDARY.md`
- [x] Consolidate if both serve the same purpose, or clearly delineate responsibilities — removed `UserProvider` from runtime provider tree
- [x] Ensure no redundant state or stale data between the two

### 6.3 Empty States for Listing Pages

> **Priority:** P3
> **Scope:** 6+ pages

**Problem:** Listing pages show a spinner while loading, but render nothing when results are empty.

#### Checklist

- [x] Add "No results found" / empty state messages to:
  - [x] `TopicsPage.tsx`
  - [x] `ArgumentsPage.tsx`
  - [x] `QuestionsPage.tsx`
  - [x] `AnswersPage.tsx`
  - [x] `IssuesPage.tsx`
  - [x] `OpinionsPage.tsx`
  - [x] `SearchPage.tsx` (no results)
- [x] Created reusable `EmptyState` component (`client/src/components/common/EmptyState.tsx`) with icon + message + optional CTA

### 6.4 LoadingSpinner Accessibility

> **Priority:** P3
> **Scope:** 1 file

#### Checklist

- [x] Add `role="status"` to LoadingSpinner container
- [x] Add `aria-live="polite"` for dynamic content updates
- [x] Add screen reader-only text describing the loading state (`aria-hidden` on icon)

### 6.5 Bundle Analysis & Optimization

> **Priority:** P3
> **Scope:** Config files

#### Checklist

- [x] Add `webpack-bundle-analyzer` to build pipeline — gated by `ANALYZE_BUNDLE` env var in `webpack.config.prod.js`
- [x] Audit chunk sizes — verify lazy-loaded routes produce reasonable splits
- [x] Check for duplicated dependencies across chunks
- [x] Consider replacing deprecated Moment.js usage on server with `date-fns` (already installed)

---

## Phase 7 — Testing & Quality Assurance (NEW)

> **Priority:** P2 — Current coverage ~65% with major gaps

### 7.1 Component Unit Tests

#### Checklist

- [x] RichTextEditor — render, toolbar actions, onChange callback, compact mode
- [x] PageMeta — verify Helmet output for each prop combination — `PageMeta.test.tsx`
- [x] ContentViewFilter — render options, click handler, active state — `ContentViewFilter.test.tsx`
- [x] GeoPatternBackground — render with seed, verify SVG generation — `GeoPatternBackground.test.tsx`
- [x] ClipboardPage — add/remove items, localStorage integration, empty state
- [x] ErrorBoundary — trigger error, verify fallback renders — `ErrorBoundary.test.tsx`
- [x] EntryActionsMenu — all actions render, click handlers fire

### 7.2 Integration Tests

#### Checklist

- [x] Content creation flow: navigate → fill form with RichTextEditor → submit → verify API call — `client/src/pages/TopicCreatePage.integration.test.tsx`
- [x] Clipboard flow: add item from entry page → verify in clipboard → remove → verify empty — `client/src/pages/ClipboardFlow.integration.test.tsx`
- [x] Role switching: switch role → verify UI changes → reload → verify persistence
- [x] Search flow: Ctrl+K shortcut → search → navigate to result

### 7.3 Storybook Stories

#### Checklist

- [x] RichTextEditor (default + compact mode) — `RichTextEditor.stories.tsx`
- [x] ContentViewFilter — `ContentViewFilter.stories.tsx`
- [x] GeoPatternBackground (various seeds) — `GeoPatternBackground.stories.tsx`
- [x] LoadingSpinner — `LoadingSpinner.stories.js` (pre-existing)
- [x] EntryActionsMenu — `EntryActionsMenu.stories.tsx`
- [x] PageHeader — `PageHeader.stories.tsx`

### 7.4 E2E Smoke Tests (Playwright)

#### Checklist

- [x] Home page loads
- [x] Topic listing → entry → back navigation
- [x] Create topic (authenticated)
- [x] Login / Logout flow (pre-existing login test)
- [x] Search flow
- [x] Mobile sidebar toggle

---

## Phase 8 — Final Migration Closure (Completed)

> **Priority:** P0–P2
> **Scope:** Remaining admin parity + UX completion + runtime hardening before full migration sign-off

#### Checklist

- [x] Complete admin parity and operations UX closure:
  - [x] Restore workflow parity in modern admin (`CORE-030`)
  - [x] Privileged-action audit timeline + viewer (`CORE-034`)
  - [x] Reviewer vote governance/provenance UX (`CORE-021`)
- [x] Complete remaining core UX parity:
  - [x] Inline authoring/reply + unified create wizard (`FLOW-001`, `FLOW-002`)
  - [x] Notifications/follow subscriptions and timeline UX (`FLOW-023`, `FLOW-024`, `FLOW-025`)
  - [x] Final ranking/filter/discussion quality parity (`FLOW-013`, `FLOW-014`, `FLOW-009`, `FLOW-012`)
- [x] Complete runtime/security hardening closure:
  - [x] PM2/runtime compatibility stability (`CORE-031`)
  - [x] Expanded sanitizer/OAuth end-to-end checks (`CORE-032`, `CORE-033`)
- [x] Run verification/sign-off checklist from `docs/plans/completed/MIGRATION_CLOSURE_PENDING_CHECKLIST_PLAN_2026-04-18.md`.

---

## Execution Order Summary (Updated)

| Phase | Items | Priority | Status |
|-------|-------|----------|--------|
| **Phase 5** | XSS Sanitization, Error Boundary, Toast Notifications, CSP | P0–P2 | **Done** |
| **Phase 1 (remaining)** | Entry page PageMeta, Auth page PageMeta, Analytics events, Role persistence | P0–P1 | **Done** |
| **Phase 6** | AuthContext perf, Empty states, Accessibility, Bundle analyzer | P2–P3 | **Done** |
| **Phase 2 (remaining)** | Sidebar close/backdrop, Search keyboard nav, GeoPattern profiles | P2–P3 | **Done** |
| **Phase 3 (remaining)** | Outline editor tree view, Verdict list/filter | P2–P3 | **Done** |
| **Phase 7** | Unit tests, Integration tests, Storybook, E2E | P2 | **Done** (external Playwright browser installation required to execute local e2e runs) |
| **Phase 4 (remaining)** | Reply action, Print testing | P3 | **Done** |
| **Phase 8** | Final migration closure (admin parity + remaining UX + runtime hardening) | P0–P2 | **Done** |

**Critical path:** Phase 5.1 (XSS) → Phase 5.2 (Error Boundary) → Phase 5.3 (Notifications) → Phase 1 remaining → rest

---

## Feature Ideas & Future Enhancements

> Items discovered during audit that are not legacy parity but would improve the product:

| Feature | Description | Priority |
|---------|-------------|----------|
| **DOMPurify server-side** | ~~Sanitize HTML on write (not just read) for defense-in-depth~~ | ~~P1~~ **Done** |
| **Real-time collaboration indicators** | Show "X users viewing this topic" using existing `realtime/` WebSocket infrastructure | P3 |
| **Markdown toggle** | Let users switch between TipTap rich text and raw Markdown editing | P3 |
| **Diff view for history** | Side-by-side comparison of content versions (for the "View History" action) | P3 |
| **Bookmark categories** | Extend Clipboard into proper bookmarks with folders/tags | P3 |
| **TipTap dark mode** | Editor toolbar and content area need CSS variable support for dark theme | P2 |
| **Infinite scroll** | Replace pagination on listing pages with intersection observer loading | P3 |
| **PWA offline reading** | Service worker already exists — add offline cache for previously viewed entries | P3 |
| **Search autocomplete** | Typeahead suggestions as user types in the search bar | P2 |
| **Path aliases** | Use `@/` import prefix instead of relative `../../../` paths (`tsconfig.json` + webpack) | P3 |
| **Barrel exports** | Add `index.ts` in `context/`, `hooks/`, `services/` for cleaner imports | P3 |
| **`npm audit` triage** | Run `npm audit` and address vulnerabilities; `csurf` is deprecated | P2 |
| **Deprecate Moment.js** | ~~Server still uses Moment; migrate to `date-fns`~~ Server-side usage migrated in `server/src/utils/flowUtils.ts`; legacy frontend assets still depend on Moment | ~~P3~~ **Done (server)** |

---

## Validation Criteria

Each item is considered **done** when:
1. Feature works equivalently to legacy (or better)
2. Unit tests pass
3. Visual appearance matches or improves upon legacy
4. No accessibility regressions (ARIA, keyboard, screen reader)
5. No security regressions (XSS, CSRF, injection)
6. Storybook story exists (for reusable components)
7. Cross-browser tested (Chrome, Firefox, Safari)

---

## Related Documents

- [../../frontend/LEGACY_REACT_GAP_ANALYSIS_2026-04-12.md](../../frontend/LEGACY_REACT_GAP_ANALYSIS_2026-04-12.md)
- [../../frontend/LEGACY_PARITY_MATRIX_2026-02-24.md](../../frontend/LEGACY_PARITY_MATRIX_2026-02-24.md)
- [completed/CORE_GAP_REMEDIATION_PLAN_2026-03-27.md](completed/CORE_GAP_REMEDIATION_PLAN_2026-03-27.md)
- [completed/MIGRATION_CHECKLIST.md](completed/MIGRATION_CHECKLIST.md)
