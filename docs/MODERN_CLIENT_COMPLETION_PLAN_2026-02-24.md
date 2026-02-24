# Modern Client Completion Plan (2026-02-24)

## Audit Summary

This audit answers three questions:

1. Is social login/registration fully implemented in the modern React client?
2. Is the rest of the app fully implemented in the modern React client?
3. What should be fixed next?

### Current verdict

- Social login/registration in React client: **Not fully implemented**.
- Overall React app parity with legacy flows: **Not fully implemented**.
- A completion plan is required before claiming migration parity.

## Evidence Snapshot

- Social buttons exist in `client/src/components/Auth/SocialLoginButtons.tsx` but only emit callbacks; no redirect wiring to OAuth endpoints.
- Signup page is now a validated React form wired to `/api/auth/signup`.
- Forgot/reset pages now call auth APIs with token-aware UX in React.
- Legacy server still owns OAuth routes (`/login/google`, `/login/github`, `/login/facebook`, `/login/twitter`, and signup/account variants) in `middlewares/routes.ts`.
- No Apple/Microsoft strategies in `middlewares/passport.ts`.
- API surface is mostly read-only for content domain controllers; `router.post/put/delete` exists mainly in auth/monitoring (`controllers/api/*`).
- Migration scaffolds remain in 51 React page modules (scan using `rg "migration scaffold|scaffold" client/src/pages`).

## Completion Checklist

Legend: `[x]` done, `[~]` partial, `[ ]` not done

### A. Auth and Identity

- [x] React login page with session-cookie auth (`/api/auth/login`, `/api/auth/me`, `/api/auth/logout`).
- [x] React signup route implemented with backend signup integration.
- [x] Social login redirect wiring from React UI to backend OAuth routes.
- [x] Social signup redirect wiring from React signup flow.
- [x] Social account connect/disconnect controls in React account settings.
- [ ] Apple OAuth provider support (backend + frontend).
- [ ] Microsoft OAuth provider support (backend + frontend).
- [x] Forgot/reset password API endpoints implemented with token generation and validation.
- [x] Production-grade React forgot/reset password flow with token validation and user feedback states.

### B. Core Content Workflows

- [x] Core read/list pages for topics/arguments/questions/issues/opinions/answers/artifacts exist.
- [ ] Create topic flow backed by real API mutation (currently simulated in UI).
- [ ] Create argument flow backed by real API mutation (currently simulated in UI).
- [ ] Create/edit flows for question/answer/issue/opinion/artifact in React.
- [ ] Group create/manage flows backed by real API mutations.
- [ ] Profile pages/create-page flows backed by real APIs.

### C. Admin and Account Parity

- [~] Admin route shell exists in React.
- [ ] Users/admin groups/categories/statuses pages implemented with real data/actions (currently scaffold-heavy).
- [ ] DB backup/admin operations parity in React.
- [ ] Account verification workflow parity in React.

### D. API/Contract Readiness

- [x] Versioned compatibility route (`/api/v1/*`) present.
- [x] Realtime SSE baseline present (`/api/realtime/events`).
- [ ] Mutation endpoints for modern client workflows (topics/arguments/questions/etc.).
- [ ] Standardized success envelope and typed DTOs for high-traffic endpoints.
- [ ] OpenAPI/contract documentation for mobile/web shared clients.
- [ ] Contract tests for critical auth + content mutation flows.

### E. Migration Completion and Quality Gates

- [x] Dark mode baseline completed.
- [x] Storybook baseline completed.
- [ ] Remove or implement remaining scaffold pages in route surface.
- [ ] Reduce `client/src` `any`/lint warnings to agreed threshold.
- [ ] Full parity acceptance/UAT against legacy-critical flows.

## Implementation Plan (Ordered)

1. **P0 - Auth completion**
- Wire social login/signup buttons to existing backend OAuth entry routes.
- Implement non-scaffold signup form with backend integration.
- Define final strategy for forgot/reset (legacy redirect vs native API completion).
- Deliver acceptance tests covering local + social auth entry paths.

2. **P1 - API mutation enablement**
- Add/standardize REST mutations for topics/arguments and next priority entities.
- Introduce typed request/response DTOs for new mutation endpoints.
- Add server tests for mutation success/error envelopes.

3. **P2 - React scaffold burn-down**
- Replace scaffold admin/account/group/profile pages with real data states.
- Implement loading/error/empty states and permission guards.
- Remove placeholder text from all user-facing routes in the app router.

4. **P3 - Parity verification**
- Build route-by-route parity matrix against legacy flows.
- Execute UAT and regression test pack.
- Mark migration complete only when all P0-P3 checklist items are `[x]`.

## Recommended Immediate Tickets

- [x] Wire `SocialLoginButtons` to OAuth redirect URLs and add integration tests.
- [x] Replace `SignupPage` scaffold with real form + submit flow.
- [x] Decide/implement forgot-reset strategy (native API vs legacy handoff) and update UI accordingly.
- [ ] Create API mutation endpoints for topic and argument create flows.
- [ ] Replace top 10 scaffold pages in admin/account/group areas with live data implementations.
