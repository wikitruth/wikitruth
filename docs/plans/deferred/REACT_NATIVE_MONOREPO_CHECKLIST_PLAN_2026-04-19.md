# React Native Monorepo Checklist Plan (2026-04-19)

## Status

Deferred by explicit product decision on 2026-07-13. No React Native workspace implementation or rollout work is part of the active execution queue.

## Objective

Deliver a React Native client using Expo with low risk to current web/server flows, while maximizing code reuse through shared packages in this repository.

## Decision

- Adopt a monorepo layout in this repository.
- Keep current web/server runtime stable first; introduce mobile and shared packages incrementally.
- Share contracts, domain types, and API logic; do not directly share web UI components.

## References

- `docs/strategy/MOBILE_APP_STRATEGY_2026-02-24.md`
- `docs/api/openapi.json`
- `client/src/services/api/*`
- `client/src/types/api.ts`
- `server/src/controllers/api/auth.ts`

## Scope

In scope:
- `apps/mobile` Expo app
- `packages/*` for shared API contract/types/client logic
- Auth transport split (web cookie/CSRF vs mobile bearer token)
- Mobile MVP screens: auth, feed/topics, search, entry detail
- CI checks for shared packages + mobile type/lint/test

Out of scope:
- Full parity with all web routes in first pass
- Native-only features beyond MVP (advanced push flows, deep offline conflict queue, realtime collaboration UX)
- Migration of current web app into `apps/web` in this first iteration

## Target Layout

```text
.
├── apps/
│   └── mobile/
├── packages/
│   ├── api-contract/
│   ├── domain/
│   └── http-client/
├── client/
├── server/
└── docs/
```

## Phase 0 - Guardrails and Baseline

- [ ] Confirm Node/npm version compatibility for Expo toolchain and current repo engines.
- [ ] Capture baseline validation before changes:
  - [ ] `npm run test:server`
  - [ ] `npm run test:client`
  - [ ] `npm run build:server`
  - [ ] `npm run build:client`
- [ ] Create branch for mobile monorepo setup.
- [ ] Document branch + baseline command results in this plan file.

## Phase 1 - Workspace Bootstrap

- [ ] Add npm workspace configuration for `apps/*` and `packages/*`.
- [ ] Scaffold `apps/mobile` using Expo + TypeScript.
- [ ] Add root scripts for workspace tasks:
  - [ ] `mobile:dev`
  - [ ] `mobile:test`
  - [ ] `mobile:typecheck`
  - [ ] `mobile:lint`
- [ ] Ensure existing root scripts still run unchanged.
- [ ] Add workspace README notes for install/run flow.

## Phase 2 - Shared Contracts and Types

- [ ] Create `packages/api-contract`:
  - [ ] Generate typed contracts from `docs/api/openapi.json`.
  - [ ] Add generation script and lockfile-safe command.
  - [ ] Add CI check to fail on stale generated contract output.
- [ ] Create `packages/domain`:
  - [ ] Move/copy stable DTO and response envelope types from web client.
  - [ ] Export strict public API (`index.ts`) with no web-only dependencies.
  - [ ] Add tests for key runtime validators/normalizers if introduced.
- [ ] Update web client imports to consume shared package exports where safe.

## Phase 3 - Shared HTTP Client with Platform Adapters

- [ ] Create `packages/http-client` core:
  - [ ] Shared request builder and response/error normalization.
  - [ ] Shared pagination + envelope parsing helpers.
- [ ] Implement web adapter:
  - [ ] Preserve cookie + CSRF behavior used by current web auth flows.
- [ ] Implement mobile adapter:
  - [ ] Bearer token injection (`Authorization: Bearer ...`).
  - [ ] Client headers (`x-client-platform`, `x-client-version`, `x-client-build`).
  - [ ] Refresh token flow for `/api/auth/token/refresh`.
- [ ] Store mobile tokens securely (Expo SecureStore), never plaintext storage.
- [ ] Add unit tests for both adapters and refresh/retry behavior.

## Phase 4 - Mobile MVP App Delivery

- [ ] Implement app shell and navigation in `apps/mobile`.
- [ ] Implement auth flow:
  - [ ] Sign in via `/api/auth/token`
  - [ ] Sign out/revoke via `/api/auth/token/revoke`
  - [ ] Bootstrap session from stored tokens
- [ ] Implement read-only content flows:
  - [ ] Home/topics listing
  - [ ] Search listing
  - [ ] Entry detail pages (topic/argument/question/answer/issue/opinion/artifact)
- [ ] Implement loading/empty/error states mapped to API envelope contracts.
- [ ] Add basic telemetry headers on every request.
- [ ] Verify compatibility with `/api/v1/*` base URL.

## Phase 5 - Tooling and CI Hardening

- [ ] Add `apps/mobile` lint/type/test commands to CI.
- [ ] Add shared package build/type/test commands to CI.
- [ ] Add contract-generation drift check to CI.
- [ ] Add smoke test for mobile auth token lifecycle against local server.
- [ ] Update docs:
  - [ ] `README.md` quickstart section for mobile dev
  - [ ] Mobile environment variable guide
  - [ ] Troubleshooting notes (simulator/device, API base URL, token refresh)

## Phase 6 - Controlled Rollout

- [ ] Internal QA pass on iOS simulator and Android emulator.
- [ ] Confirm no regressions to existing web/server flows.
- [ ] Publish first internal build (Expo dev build or preview distribution).
- [ ] Collect defects and triage into:
  - [ ] Must-fix before beta
  - [ ] Post-beta enhancements

## Verification Gate (Required Before Completion)

This plan is not eligible for `docs/plans/completed/` until all items below pass in a separate verification pass and there are no pending/deferred checklist items.

- [ ] Server validation:
  - [ ] `npm run test:server`
  - [ ] `npm run build:server`
- [ ] Web validation:
  - [ ] `npm run test:client`
  - [ ] `npm run build:client`
- [ ] Mobile/shared validation:
  - [ ] `npm run mobile:typecheck`
  - [ ] `npm run mobile:test`
  - [ ] shared package tests/typechecks
- [ ] Manual verification evidence:
  - [ ] mobile login/token refresh/revoke flow
  - [ ] mobile home/search/detail flows
  - [ ] no breakage on web auth and key web pages
- [ ] Documentation verification:
  - [ ] commands in docs run as written
  - [ ] env variables documented and accurate

## Risk and Rollback

- [ ] Keep workspace introduction additive; avoid moving `client/` or `server/` directories in first pass.
- [ ] If workspace wiring causes instability, revert workspace config and isolate mobile scaffolding in `apps/mobile` without shared-package adoption.
- [ ] Keep shared package extraction in small slices so regressions are easy to isolate.

## Progress Log

- 2026-04-19: Plan created.
- 2026-05-15: Revalidation pass confirmed no monorepo bootstrap artifacts yet (`apps/mobile` absent, `packages/*` absent, root `package.json` has no workspaces or `mobile:*` scripts). Checklist remains not started.
- 2026-07-13: React Native implementation and rollout were explicitly deferred; the checklist remains outside the active execution queue.
