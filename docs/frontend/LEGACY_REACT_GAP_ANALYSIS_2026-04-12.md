# Legacy → React Client Migration Gap Analysis

**Date:** 2026-04-12
**Scope:** Deep comparison of legacy frontend (Dust.js/Jade + Backbone.js/jQuery) vs modern React client
**Baseline:** Post-parity audit (visual audit 2026-02-26, core gap remediation 2026-03-27)

---

## Executive Summary

The React client migration is **~92% complete** (55 of 60+ routes migrated). Five critical feature gaps and four major feature gaps remain. Four legacy routes have no React equivalent. Core infrastructure items (CSRF, favicons, PWA, social login, breadcrumbs, error pages) have full parity.

---

## 1. Route Coverage

### Routes Successfully Migrated (55+)

| Category | Routes | Status |
|----------|--------|--------|
| **Public Pages** | Home, About, Contact, Help, Install/PWA | ✅ All migrated |
| **Auth** | Login, Signup, Forgot Password, Reset Password, Logout | ✅ All migrated |
| **Account** | Dashboard, Settings, Email Verification | ✅ All migrated |
| **Topics** | Browse, Create, Edit, Entry/Detail, Discussion | ✅ All migrated |
| **Arguments** | Browse, Create, Edit, Entry/Detail, Discussion | ✅ All migrated |
| **Questions** | Browse, Create, Edit, Entry/Detail, Discussion | ✅ All migrated |
| **Answers** | Browse, Create, Edit, Entry/Detail | ✅ All migrated |
| **Issues** | Browse, Create, Edit, Entry/Detail, Discussion | ✅ All migrated |
| **Opinions** | Browse, Create, Edit, Entry/Detail, Discussion | ✅ All migrated |
| **Artifacts** | Browse, Create, Edit, Entry/Detail | ✅ All migrated |
| **Groups** | Directory, Create, Detail, Posts, Members | ✅ All migrated |
| **Members** | Directory, Contributors, Screeners, Reviewers, Administrators | ✅ All migrated |
| **Profiles** | Overview, Settings, Contributions, Pages, Diary, Following | ✅ All migrated |
| **Wiki Tools** | Explore, Visualize, Screening, Convert, Fast Switch | ✅ All migrated |
| **Search** | Multi-tab (All, Topics/Wiki, Diary) | ✅ All migrated |
| **Admin** | Dashboard, Users, Accounts, Admins, Admin Groups, Categories, Statuses, DB Backup | ✅ All migrated |
| **Error Pages** | 404, 500, 503 | ✅ All migrated |

### Routes Missing from React (4)

| Legacy Route | Purpose | React Status | Priority |
|---|---|---|---|
| `/clipboard/` | Content bookmarking/curation tool | ❌ Not implemented | Medium |
| `/outline/link/` | Topic hierarchy/relationship editor | ⚠️ Stub only (`OutlineLinkTo.tsx` — non-functional scaffold) | High |
| `/verdict/update/` | Dedicated verdict management page | ⚠️ Partial — verdict exists on argument forms + moderation API but no standalone page | Medium |
| `/admin/search/` | Dedicated admin search page | ⚠️ Partial — no dedicated page, possibly folded into header search | Low |

---

## 2. Critical Feature Gaps

### 2.1 Rich Text Editor — ❌ MISSING

| Aspect | Legacy | React |
|--------|--------|-------|
| Library | Summernote (jQuery WYSIWYG) | None — plain `<textarea>` |
| Toolbar | Bold, italic, underline, strikethrough, color, lists, tables, links, fullscreen, code view | N/A |
| Forms affected | All content create/edit: Topics, Arguments, Questions, Answers, Issues, Opinions, Artifacts | All create/edit pages |

**Impact:** Content creators cannot format text at all — no bold, italic, headings, tables, links, or code blocks. This is the single largest functional gap.

**Evidence:**
- `client/src/pages/ArgumentCreatePage.tsx` — uses `<TextArea>` component
- `package.json` — no Quill, TipTap, Slate, CKEditor, Draft.js, or any WYSIWYG library
- Legacy `public/js/app.min.js` — initializes Summernote with toolbar config

### 2.2 reCAPTCHA — ❌ NOT RENDERED

| Aspect | Legacy | React |
|--------|--------|-------|
| Library | Google reCAPTCHA v2/v3 | API param exists, widget not rendered |
| Signup form | ✅ Captcha widget shown | ❌ No widget |
| Contact form | ✅ Captcha widget shown | ❌ No widget |

**Impact:** Signup and contact forms are unprotected against bots and automated spam.

**Evidence:**
- `client/src/services/api.ts` — `sendContactMessage()` accepts `recaptchaResponse` param
- `client/src/pages/Contact/ContactPage.tsx` — no captcha widget or script
- `client/src/pages/Auth/SignupPage.tsx` — no captcha widget

### 2.3 Dynamic Meta Tags / SEO — ❌ MISSING

| Aspect | Legacy | React |
|--------|--------|-------|
| Page titles | Server-rendered `<title>{pageTitle} – {titleSlogan}</title>` | No `document.title` updates, no react-helmet |
| Open Graph | Server-injected OG tags | Not implemented |
| Twitter Cards | Server-injected | Not implemented |
| Schema.org | Embedded in templates | Not implemented |

**Impact:** Social sharing previews are broken (all pages show same generic title/description). Search engine indexing may be degraded for the React-rendered pages.

**Evidence:**
- Zero imports of `react-helmet`, `react-helmet-async`, or `document.title` calls in `client/src/`
- Legacy `public/templates/dust/layouts/master.dust` — dynamic `{pageTitle}` in `<title>`

### 2.4 Google Analytics — ❌ MISSING

| Aspect | Legacy | React |
|--------|--------|-------|
| Tracking | GA pageview + event tracking | Not implemented |
| Config | `googleAnalyticsTrackingId` from server config | N/A |

**Impact:** No visibility into user behavior, page popularity, or funnel analysis on the React client.

**Evidence:**
- Zero matches for `gtag`, `ga(`, `GoogleAnalytics`, or tracking ID patterns in `client/src/`
- `client/src/utils/monitoring.ts` — only tracks errors to a custom endpoint

### 2.5 Role Switching (Contributor/Reader) — ❌ MISSING

| Aspect | Legacy | React |
|--------|--------|-------|
| UI | "Role Switcher" in user dropdown menu | Not implemented |
| Modes | Toggle between Contributor and Reader views | N/A |

**Impact:** Users cannot switch between content creation (Contributor) and consumption (Reader) modes.

**Evidence:**
- No "role switch", "contributor toggle", or mode-switching code in `client/src/`
- Legacy user dropdown includes explicit role switcher option

---

## 3. Major Feature Gaps

### 3.1 Content View Filters — ❌ MISSING

| Aspect | Legacy | React |
|--------|--------|-------|
| Sidebar filters | "Verified", "Latest", "Everything" | Not implemented |
| List page filtering | Filter by verification status | Only search/sort, no status filter |

**Impact:** Users cannot filter content by trustworthiness/verification on browse pages.

### 3.2 Off-Canvas Responsive Sidebar — ⚠️ DEGRADED

| Aspect | Legacy | React |
|--------|--------|-------|
| Mobile behavior | Animated slide-in/slide-out off-canvas | Static sidebar, always visible or hidden |
| Toggle button | `data-toggle="offcanvas"` | No toggle |

**Impact:** Mobile UX is less polished — no smooth sidebar transition.

### 3.3 Keyboard Shortcuts — ❌ MISSING

| Aspect | Legacy | React |
|--------|--------|-------|
| Admin search | ESC (clear), Enter (navigate), Up/Down arrows (navigate results) | No keyboard handlers |
| Debounced search | 333ms debounce with keyboard nav | Search exists without keyboard shortcuts |

**Impact:** Power users lose efficiency in admin workflows.

### 3.4 GeoPattern SVG Generation — ❌ MISSING

| Aspect | Legacy | React |
|--------|--------|-------|
| Library | GeoPattern for dynamic SVG patterns | Not implemented |
| Usage | Profile backgrounds, content item visuals | Static `green-bg-pattern.svg` only |

**Impact:** Visual personalization lost — all profiles/items look the same.

---

## 4. Minor Gaps

| # | Feature | Legacy | React | Notes |
|---|---------|--------|-------|-------|
| 4.1 | **Print Styles** | Bootstrap 3 print CSS inherited | No explicit `@media print` | Printing may render poorly |
| 4.2 | **Date Formatting** | Moment.js (rich library) | Native `Date.toLocaleDateString()` | Less sophisticated but functional |
| 4.3 | **Flash Messages** | Session-based cross-page flash | Inline Alert component | Different UX, React approach is arguably better |
| 4.4 | **Content Actions** | "Link", "History" in entry popovers | Fewer actions in EntryActionsMenu | Entity-relationship linking and version history actions missing |

---

## 5. Confirmed Full Parity (No Gaps)

| Feature | Notes |
|---------|-------|
| **CSRF Token Handling** | Both extract from `_csrfToken` cookie, send `x-csrf-token` header |
| **Favicon Suite** | All 9 Apple touch sizes, Android, standard, MS TileImage — identical |
| **Vis.js Network Visualization** | React lazy-loads (improvement over legacy pre-load) |
| **Social Login UI** | 6 providers, React uses dynamic provider loading (improvement) |
| **Social Account Linking** | SettingsPage has full connect/disconnect per provider |
| **Breadcrumbs** | 20+ pages use Breadcrumb component — widespread and consistent |
| **PWA / Service Worker** | Both present; React registers conditionally |
| **Cache Busting** | Webpack content-hash (better than legacy query param approach) |
| **Verdict Display/Creation** | On argument forms + moderation API |
| **Error Pages** | 404, 500, 503 — all implemented |
| **Fast Switch (PIN Login)** | FastSwitchPage.tsx fully functional |
| **Email Verification** | VerificationPage.tsx implemented |

---

## 6. Methodology

- **Legacy codebase reviewed:** `public/views/`, `public/templates/` (122 Dust.js + 41 Jade files), `public/layouts/`, `public/js/`, `public/css/`, `public/less/`, `server/src/controllers/`, `server/src/routes/`
- **React codebase reviewed:** `client/src/` (pages, components, services, hooks, utils, routes, styles)
- **Verification:** Key gaps were independently verified by searching for library imports, component usage, and API integration patterns
- **Prior art consulted:** Visual audit (2026-02-26), Legacy Parity Matrix (2026-02-24), Core Gap Remediation Plan (2026-03-27), Migration Checklist

---

## Related Documents

- [LEGACY_PARITY_MATRIX_2026-02-24.md](LEGACY_PARITY_MATRIX_2026-02-24.md)
- [../visual-audit-modern-vs-legacy-2026-02-26.md](../visual-audit-modern-vs-legacy-2026-02-26.md)
- [../plans/completed/CORE_GAP_REMEDIATION_PLAN_2026-03-27.md](../plans/completed/CORE_GAP_REMEDIATION_PLAN_2026-03-27.md)
- [../plans/completed/MIGRATION_CHECKLIST.md](../plans/completed/MIGRATION_CHECKLIST.md)
