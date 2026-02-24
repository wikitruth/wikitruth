# Project Enhancement Proposal (2026-02-24)

## Scope

This proposal consolidates pending enhancement work after migration closure, based on a full repository scan across server, client, templates, tests, and docs.

## Implementation Tracker

- [x] E0. Archive completed migration documents into `docs/archive/migrations` with root pointer stubs.
- [x] E1. Fix TS7006 errors in `controllers/api/admin.ts`.
- [x] E2. Fix TS7006 errors in `controllers/api/auth.ts`.
- [x] E3. Add typed signatures to `controllers/api/monitoring.ts` and `controllers/api/v1.ts`.
- [x] E4. Re-enable `build:server` in `test:ci` and CI workflow.
- [x] E5. Patch XSS hotspot in `public/js/app.js`.
- [ ] E6. Implement real user/app fetch in `client/src/components/Layout/Header.tsx`.
- [ ] E7. Remove unused vars and `any` in `client/src/pages/TopicsPage.tsx`.
- [ ] E8. Remove unused vars and `any` in `client/src/pages/HomePage.tsx`.
- [ ] E9. Publish dependency upgrade plan by risk tier.
- [ ] E10. Start PWA Phase 0 (manifest + service worker + ADR).
- [ ] E11. Add dark mode theme tokens and toggle support.
- [ ] E12. Add baseline realtime event channel (WebSocket/SSE) for React client.
- [ ] E13. Add Storybook for component catalog and visual diffing baseline.
- [ ] E14. Ship a mobile app strategy document with API contract readiness checklist.

## Current State Snapshot

- Codebase mix:
  - JavaScript files: `2170`
  - TypeScript files: `159`
  - TSX files: `220`
- Legacy template inventory (active for comparison):
  - Dust templates (`*.dust`): `122`
  - Jade templates (`*.jade`): `41`
- Type suppression debt:
  - `@ts-ignore`: `1612`
  - `@ts-nocheck`: `0`
- Build/type status:
  - `npm run build:server`: failing (`37` implicit-`any` TS7006 errors)
  - Primary failing files: `controllers/api/admin.ts`, `controllers/api/auth.ts`, `controllers/api/monitoring.ts`, `controllers/api/v1.ts`
- Lint status:
  - ESLint warnings: `77`
  - ESLint errors: `0`
  - Main warning cluster: React page modules using `any` and unused variables.
- Security/dependency posture:
  - `npm audit` vulnerabilities: `80` (`11 critical`, `52 high`, `14 moderate`, `3 low`)
  - Multiple major-version upgrade opportunities remain (Express 5, React 19, ESLint 10, Jest 30, etc.).

## Backlog Enhancements Pending

These remain functionally pending as product/program enhancements:

1. Progressive Web App capabilities (offline shell, manifest, installability).
2. Real-time updates via WebSockets for collaborative/wiki interactions.
3. Mobile app strategy (React Native or API-first mobile client).
4. Accessibility hardening beyond current baseline (screen reader and keyboard depth checks on all major flows).
5. Dark mode/theme switching.
6. Optional Storybook for component development and visual QA.

## High-Priority Gaps To Fix First

1. Restore server TypeScript build integrity.
- Why: CI currently avoids `build:server`, and type-safety completion claims are now inconsistent with actual build state.
- Targets:
  - `controllers/api/admin.ts`
  - `controllers/api/auth.ts`
  - `controllers/api/monitoring.ts`
  - `controllers/api/v1.ts`
- Done criteria: `npm run build:server` passes; `test:ci` re-includes `build:server`.

2. Resolve explicit security TODOs and high-risk hotspots.
- Notable hotspot: `public/js/app.js:88` flagged as XSS vulnerability.
- Additional correctness TODO/FIXME hotspots:
  - `controllers/groups.ts:42`
  - `controllers/admin.ts:426`
  - `controllers/clipboard.ts:26`
  - `controllers/async/clipboard.ts` (multiple data ownership/thread TODOs)
- Done criteria: security triage issues opened and fixed in prioritized order with tests.

3. Reduce client typing/lint debt in migrated React pages.
- Current signal: `77` lint warnings, `63` explicit `any` occurrences in `client/src` (non-test).
- Important placeholder still unresolved: `client/src/components/Layout/Header.tsx:12`.
- Done criteria: zero unused-var warnings in migrated surface; significant reduction of `any` in page/domain models.

## Proposed Roadmap

### Phase A (Week 1): Stabilization and Trust Restoration

- A1. Fix server API controller typing and re-enable server build in CI.
- A2. Add a CI gate for `npm run build:server` and fail on TS7006 regressions.
- A3. Create security fix issue set from existing TODO/FIXME list and patch top risks.
- A4. Keep migration archive links and docs drift checks green.

### Phase B (Weeks 2-3): Type and Contract Hardening

- B1. Replace broad `Record<string, unknown>` API responses with domain DTOs.
- B2. Introduce typed request/response helpers for API controllers.
- B3. Eliminate high-volume `any` usage in top traffic pages (`Home`, `Topics`, `Arguments`, `Search`).
- B4. Add stricter lint rule tiers for new/modified files.

### Phase C (Weeks 3-5): Security and Dependency Modernization

- C1. Dependency upgrade wave 1 (non-breaking minors/patches).
- C2. Dependency upgrade wave 2 (major versions behind compatibility wrappers).
- C3. Re-run vulnerability audit and publish updated risk report.
- C4. Harden legacy client JS where still active in legacy comparison mode.

### Phase D (Weeks 5-8): Product Enhancements Backlog

- D1. PWA baseline (manifest, service worker strategy, install prompt).
- D2. Dark mode and theme token system.
- D3. Real-time events for key collaborative actions.
- D4. Optional Storybook setup for component catalog and visual diffing.

## Delivery Structure

- Use one PR per task (no mixed feature/refactor PRs).
- Keep legacy templates retained and read-mostly during enhancement phases.
- Require per-task acceptance checks:
  - `npm run test:server`
  - `npm run test:client`
  - `npm run test:coverage`
  - `npm run build:client`
  - `npm run build:server`

## Suggested Next 10 Tickets

1. Fix TS7006 errors in `controllers/api/admin.ts`.
2. Fix TS7006 errors in `controllers/api/auth.ts`.
3. Add typed signatures to `controllers/api/monitoring.ts` and `controllers/api/v1.ts`.
4. Re-enable `build:server` in `test:ci` and CI workflow.
5. Patch XSS hotspot in `public/js/app.js:88` with regression tests.
6. Implement real user/app fetch in `client/src/components/Layout/Header.tsx`.
7. Remove unused vars and `any` in `client/src/pages/TopicsPage.tsx`.
8. Remove unused vars and `any` in `client/src/pages/HomePage.tsx`.
9. Publish dependency upgrade plan by risk tier (major/minor/legacy locked).
10. Start PWA Phase 0 (manifest + cache strategy ADR).
