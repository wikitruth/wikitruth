# System + Modern Client Implementation Plan (2026-02-26)

## Goal

Close remaining parity gaps between legacy and modern flows, harden API contracts, and finish core modernization work needed for reliable web and future mobile clients.

## Status Legend

- `[x]` complete or already in place
- `[~]` partial
- `[ ]` pending

## Verified Current State

- [x] Core auth and content CRUD flows exist in modern client.
- [x] Social auth redirect wiring exists in modern auth UI.
- [x] Admin, groups, and profile modern pages exist with baseline API integrations.
- [x] OpenAPI spec now covers the active modern API route surface.
- [x] E2E critical-flow smoke coverage expanded for modern parity routes.
- [x] Discussion tabs in entry pages have matching modern routes.
- [x] `/visualize` modern route is now data-driven.
- [x] Group posts modern route now has native read flow and create hooks.
- [x] Member profile `following` and `topics` pages are data-backed.
- [x] Search API parity now includes legacy-priority entity buckets.
- [x] API responses now include a standardized success/error envelope via middleware.
- [x] Critical controller TODO/FIXME items were resolved or moved to explicit guardrails.

## P0 Critical Parity + Reliability

- [x] **P0.1 Fix broken discussion navigation**
  - Implement discussion routes for topic/argument/question/issue/opinion entry pages, or remove/disable discussion tabs until implemented.
  - Acceptance:
    - No entry-page tab points to an unmatched route.
    - Route tests prove expected behavior for each entity.

- [x] **P0.2 Implement real modern visualize page**
  - Replace `client/src/pages/VisualizePage.tsx` placeholder with working data-driven visualization view.
  - Acceptance:
    - Page loads real data.
    - Empty/error/loading states are handled.
    - One E2E test verifies render and basic interaction.

- [x] **P0.3 Complete group posts in modern flow**
  - Replace legacy handoff in `client/src/pages/Groups/Group/GroupPosts.tsx` with native posts stream and post creation hooks as applicable.
  - Acceptance:
    - Read path available without legacy redirect.
    - Permission handling matches group privacy/member rules.

- [x] **P0.4 Complete profile sections still placeholder**
  - Implement functional data-backed versions of:
    - `client/src/pages/Members/Profile/ProfileFollowing.tsx`
    - `client/src/pages/Members/Profile/ProfileTopics.tsx`
  - Acceptance:
    - Pages show real data and handle private-profile constraints.

- [x] **P0.5 Restore search parity for modern API**
  - Extend `controllers/api/search.ts` to support legacy-search entity coverage (at minimum answers, artifacts, issues, opinions), with typed response shape.
  - Acceptance:
    - Modern search response includes all intended entity buckets.
    - React search UI can render each bucket or intentionally hide with documented rationale.

- [x] **P0.6 Standardize API envelope and errors**
  - Align all `controllers/api/*` endpoints to one response contract for success and errors.
  - Acceptance:
    - No mixed envelope patterns in API controllers.
    - Contract tests enforce response schema consistency.

## P1 Contract + Test Hardening

- [x] **P1.1 Expand OpenAPI to full active modern API surface**
  - Add missing routes and schemas for admin, members, groups, verification, search, realtime, and backup operations.
  - Acceptance:
    - `docs/api/openapi.json` includes the active route surface.
    - Validation step passes in CI.

- [x] **P1.2 Raise E2E coverage for critical flows**
  - Add Playwright coverage for:
    - Auth social callback smoke
    - Group lifecycle and permissions
    - Profile tabs (topics/following/pages)
    - Search results across entity types
    - Visualize route
  - Acceptance:
    - Critical-path E2E suite passes in CI.
    - Regression on major user flows is detectable.

- [x] **P1.3 Address high-risk TODO/FIXME debt in controller logic**
  - Prioritize:
    - `controllers/groups.ts`
    - `controllers/async/clipboard.ts`
    - `controllers/topics.ts`
  - Acceptance:
    - Security/data-integrity TODO/FIXME items are resolved or converted into tracked tickets with explicit guardrails.

## P2 TypeScript + Modernization Quality

- [x] **P2.1 Remove remaining `@ts-ignore` heavy zones in API controllers**
  - Start with `controllers/api/search.ts`, then other API modules with high suppression density.
  - Acceptance:
    - Strictness debt reduced measurably by module.
    - Types for request/response payloads are declared and reused.

- [x] **P2.2 Strengthen API client typing in modern client**
  - Replace loose `unknown` response handling in `client/src/services/api.ts` call sites with typed DTO contracts.
  - Acceptance:
    - Core page data loaders compile without fallback casting.
    - Runtime errors caused by payload shape mismatch are reduced.

- [x] **P2.3 Mobile-readiness contract backlog**
  - Execute unresolved items from `docs/MOBILE_APP_STRATEGY_2026-02-24.md`:
    - token lifecycle model
    - pagination/rate-limit/deprecation contracts
    - mobile observability tags
    - mobile contract tests
  - Acceptance:
    - API readiness checklist can be advanced to all `[x]` for MVP scope.

## Execution Order

- [x] Execute all P0 items first.
- [x] Execute P1 after P0 is complete.
- [x] Execute P2 after P1, except P2.1/P2.2 can run in parallel with P1 when low-risk.

## Definition of Done

- [x] No placeholder or legacy-handoff UX remains on active modern routes.
- [x] No broken tab/link routes in modern client navigation.
- [x] API contracts are standardized and documented in OpenAPI.
- [x] Critical user journeys are covered by automated E2E tests.
- [x] High-risk TODO/FIXME items in core controllers are either fixed or formally tracked with explicit risk acceptance.
