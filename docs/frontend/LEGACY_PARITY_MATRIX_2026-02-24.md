# Legacy-to-Modern Parity Matrix (Updated 2026-02-26)

Legend:
- `Done` = implemented in modern React client and validated in current execution cycle.
- `Partial` = implemented in part, but parity-critical scope is still open.
- `Pending` = planned but not yet implemented.
- `Legacy retained` = legacy route/template intentionally preserved for side-by-side comparison.

| Area | Legacy baseline | Modern React / API status | Status | Evidence |
|---|---|---|---|---|
| Local auth login/logout | `/login`, `/logout` templates | `/app/login`, `/app/logout` + `/api/auth/login|logout|me` | Done + Legacy retained | `client/src/pages/Auth/loginFlow.integration.test.tsx`, auth API tests |
| Signup + social auth redirects | `/signup`, OAuth provider routes | `/app/signup` + React social redirect buttons | Done + Legacy retained | `client/src/components/Auth/SocialLoginButtons.test.tsx` |
| Password recovery | Legacy forgot/reset templates | `/app/forgot-password`, `/app/reset-password` + API endpoints | Done + Legacy retained | forgot/reset API and integration coverage |
| Diary route parity | header “My Diary” legacy route behavior | `/app/members/:username/diary` and `/app/members/profile/diary` | Done + Legacy retained | route config + manual smoke |
| Contact submission parity | legacy server-backed contact form | `/app/contact` posts to `/api/contact` | Done + Legacy retained | `client/src/pages/Contact/ContactPage.tsx`, API integration |
| Fast switch parity | legacy PIN-based fast switch | `/app/fast-switch` + `/api/auth/fast-switch` | Done + Legacy retained | fast-switch API + UI flow implementation |
| Profile contributions parity | legacy multi-entity contribution tabs | `/app/members/:username/contributions` all entity buckets + more flags | Done + Legacy retained | `ProfileContributions.tsx`, `server/src/controllers/api/members.ts` |
| Profile settings parity | private profile + fast switch controls | modern profile settings wired to API | Done + Legacy retained | `ProfileSettings.tsx`, `/api/members/me/fast-switch` |
| Account settings parity | contact/identity/password/social account controls | modern account settings fully wired | Done + Legacy retained | `SettingsPage.tsx`, `/api/auth/account-settings*` |
| Entry detail parity | topic/argument/question/issue/opinion/answer/artifact detail behavior | related-child lists + non-placeholder counts + extended entry payloads | Done + Legacy retained | updated entry pages + `/api/*/entry/:id` payload parity |
| Entry actions parity | legacy more/options menu | modern actions menu (edit/report/follow/share + screener/admin actions) with modern moderation handoff to `/app/screening` and `/app/convert` | Done + Legacy retained | `EntryActionsMenu.tsx`, `client/src/pages/Wiki/Screening/ScreeningPage.tsx`, `client/src/pages/Wiki/Convert/ConvertPage.tsx`, `server/src/controllers/api/moderation.ts` |
| Search parity | legacy tabbed + scoped search | modern `all/wiki/diary` scope, tab routing, and “view more” behavior | Done + Legacy retained | `SearchPage.tsx`, `server/src/controllers/api/search.ts` |
| Contextual sidebar parity | legacy right-column contextual nav | modern contextual sidebar with section, related, diary/group shortcuts on md+ | Done + Legacy retained | `ContextSidebar.tsx`, layout integration |
| Home artifacts block parity | legacy home includes artifacts list block | modern home now renders artifacts block with “view more” parity behavior | Done + Legacy retained | `client/src/pages/HomePage.tsx` |
| Wiki migration scaffolds cleanup | legacy-vs-modern scaffold handling | unwired `client/src/pages/Wiki/*` scaffolds explicitly retired and documented | Done + Legacy retained | `docs/frontend/WIKI_SCAFFOLD_RESOLUTION_2026-02-26.md`, `client/src/pages/Wiki/README.md` |
| Parity-critical regression tests | route-level protections against parity regressions | dedicated parity checklist suite for auth, diary, entry actions, admin mutations, and social provider rendering (`npm run test:parity`, part of `test:ci`) | Done + Legacy retained | `tests/server/parity-checklist.test.js`, `package.json` |

## Accuracy Notes

- This matrix is now aligned with the active checklist in `docs/plans/completed/LEGACY_MODERN_PARITY_IMPLEMENTATION_PLAN_2026-02-26.md`.
- No pending item is marked as complete.
- Legacy templates/controllers remain intentionally available for flow comparison and rollback confidence.
