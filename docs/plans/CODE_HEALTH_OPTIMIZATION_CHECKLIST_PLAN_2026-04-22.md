# Code Health Optimization Checklist Plan (2026-04-22)

## Objective

Improve overall codebase quality, maintainability, and runtime reliability without breaking legacy compatibility commitments.

## Tracking Rules

- Every item stays unchecked (`[ ]`) until validated in code + test/lint/type outputs.
- Each PR should reference checklist item IDs (example: `T1-03`, `T5-04`).
- File-level execution tracker: `docs/plans/CODE_HEALTH_SOURCE_FILE_CHECKLIST_PLAN_2026-04-22.md`
- After each merged chunk, update this doc with:
  - completion state
  - metric deltas
  - links to changed files

## Current Baseline (Measured)

- `type:check`: passing
- `test:server`: passing (26/26)
- `test:client`: passing (50/50)
- `lint`: failing (2 errors, 28 warnings)
- Type suppression signals (server/client/tests):
  - `@ts-ignore`: 511
  - `@ts-expect-error`: 2
  - `@ts-nocheck`: 0
  - explicit-any-like patterns: 453
- Large hotspot files:
  - `server/src/utils/flowUtils.ts` (~3247 LOC)
  - `server/src/controllers/api/{auth,moderation,admin}.ts` (~1k-1.5k LOC each)
- Legacy interop density remains high (CommonJS `require/module.exports` + legacy compatibility pathways).
- `scripts/type-metrics.sh` is currently misconfigured (scans nonexistent top-level paths).

## TypeScript/Node.js Quality Assessment

### TypeScript quality

Current quality: **moderate (6/10)**.

Strengths:

- Strict TS config enabled (`strict`, `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`).
- Typecheck passes.

Weaknesses:

- High suppression debt (`@ts-ignore` concentration in API/controller and schema legacy modules).
- Many explicit `any` usages in critical paths.
- Lint gate currently broken, reducing confidence in static analysis discipline.

### Node.js/server quality

Current quality: **moderate (5.5/10)**.

Strengths:

- API test coverage is meaningful and passing.
- Security middleware and operational scripts exist.

Weaknesses:

- Very large multi-responsibility controllers and utility modules.
- Hybrid legacy-modern patterns increase complexity and cognitive load.
- Dependency stack has significant major-version lag.
- Runtime stability risk remains (historical PM2/node dylib incident).

## Delivery Strategy

Proceed in controlled tracks, starting with quality-gate trust, then type debt, then architecture and runtime hardening.

---

## Track 1: Restore Quality Gate Trust (P0)

- [ ] `T1-01` Fix ESLint configuration issue causing `react-hooks/exhaustive-deps` rule resolution failure.
- [ ] `T1-02` Fix `no-constant-condition` error in `tests/server/helpers/readBackendSource.js`.
- [ ] `T1-03` Decide and document warning policy (`warn` allowed vs fail-on-warn for CI).
- [ ] `T1-04` Make `npm run lint` pass cleanly in local and CI.
- [ ] `T1-05` Add a small CI smoke target (`lint + type:check + targeted tests`) for quick pre-merge signal.

Acceptance criteria:

- `lint` exits 0.
- No missing-rule runtime failures.
- CI catches lint/type regressions before merge.

## Track 2: Fix Type Metrics and Debt Visibility (P0)

- [ ] `T2-01` Repair `scripts/type-metrics.sh` scope paths to scan `server/src` and test targets correctly.
- [ ] `T2-02` Add per-directory counts for `@ts-ignore`, `@ts-expect-error`, and explicit `any`.
- [ ] `T2-03` Add monthly/weekly baseline snapshots under `docs/` or CI artifacts.
- [ ] `T2-04` Define reduction targets (e.g., `@ts-ignore` -30% over 2 milestones).

Acceptance criteria:

- Type metrics script runs successfully.
- Baseline and trend are visible and repeatable.

## Track 3: Type Safety Debt Burn-Down (P1)

- [ ] `T3-01` Prioritize high-density files first:
  - `server/src/controllers/api/home.ts`
  - `server/src/controllers/api/members.ts`
  - `server/src/controllers/api/{answers,artifacts,groups,issues,opinions}.ts`
- [ ] `T3-02` Replace `@ts-ignore` with proper types/interfaces or narrow `@ts-expect-error` where justified.
- [ ] `T3-03` Introduce typed request/response contracts for legacy controller handlers.
- [ ] `T3-04` Remove unnecessary `any` in shared services and flow helpers.
- [ ] `T3-05` Add lint rule guardrails to prevent new blanket suppressions.
- [ ] `T3-06` Add explicit type aliases/interfaces for controller model payloads (request body/query/params).
- [ ] `T3-07` Eliminate implicit `any` in error handling by using typed error normalization helpers.

Acceptance criteria:

- `@ts-ignore` reduced significantly (target milestone-based).
- New code introduces no net increase in suppressions.

## Track 4: Module Decomposition and Architecture Hygiene (P1)

- [ ] `T4-01` Decompose `flowUtils.ts` into domain-focused modules (`contentFlow`, `enrichment`, `filters`, `formatters`, etc.).
- [ ] `T4-02` Split oversized API controllers into focused route handlers + service layer.
- [ ] `T4-03` Enforce a max file-size/complexity guideline for new modules.
- [ ] `T4-04` Add architecture notes for legacy boundary contracts (what stays CJS vs modern TS module style).

Acceptance criteria:

- No critical hotspot file remains monolithic without decomposition plan.
- New features land in smaller, typed modules by default.

## Track 5: Legacy Interop Rationalization (P1)

- [ ] `T5-01` Inventory all `module.exports`/`require()` usage and classify:
  - boundary compatibility code
  - core internal modules
- [ ] `T5-02` Define and document legacy boundary seams (compat adapter layer only).
- [ ] `T5-03` Standardize module style strategy:
  - CJS only at legacy adapters
  - typed `import`/`export` for modern internals
- [ ] `T5-04` Migrate internal high-impact API controllers from ad hoc `require/module.exports` to typed module exports.
- [ ] `T5-05` Migrate schema/service modules where safe, with no behavior drift.
- [ ] `T5-06` Add guardrail lint rule preventing new `require()` in modern folders.
- [ ] `T5-07` Keep compatibility tests green throughout migration.

Acceptance criteria:

- Reduced scattered CJS patterns in modern internals.
- Legacy compatibility remains functionally intact.
- New CJS usage is blocked outside allowed legacy adapter paths.

## Track 6: Dependency and Toolchain Modernization (P2)

- [ ] `T6-01` Classify outdated dependencies into low/medium/high migration risk.
- [ ] `T6-02` Upgrade low-risk patch/minor dependencies first.
- [ ] `T6-03` Plan major upgrades in batches (React ecosystem, lint/tooling, auth/passport modules, server libs).
- [ ] `T6-04` Add regression tests for each major upgrade batch.
- [ ] `T6-05` Keep Node engine matrix documented and validated.

Acceptance criteria:

- Outdated dependency list reduced materially.
- No unplanned production regressions from upgrades.

## Track 7: Runtime and PM2 Reliability Hardening (P1)

- [ ] `T7-01` Reproduce and document PM2 restart/runtime issue scenarios (including dylib mismatch class issues).
- [ ] `T7-02` Extend `scripts/runtime/pm2-restart-check.sh` into environment matrix checks (Node version + brew runtime deps).
- [ ] `T7-03` Add startup preflight checks for required dynamic libs/environment assumptions.
- [ ] `T7-04` Add rollback-safe runtime validation procedure before production deploy.

Acceptance criteria:

- PM2 restart checks pass consistently in supported environments.
- Runtime incompatibilities are detected before deployment.

## Track 8: Test and Signal Quality Improvements (P2)

- [ ] `T8-01` Eliminate noisy React `act(...)` warnings in client tests.
- [ ] `T8-02` Add focused tests around refactored type-heavy controllers.
- [ ] `T8-03` Add contract tests for legacy-modern adapter boundaries.
- [ ] `T8-04` Add perf budget checks for key pages/endpoints where practical.

Acceptance criteria:

- Cleaner test output (reduced warning noise).
- Refactor confidence maintained via targeted coverage.

---

## Suggested Execution Order

1. Track 1
2. Track 2
3. Track 3 + Track 4 (parallel by module ownership)
4. Track 5
5. Track 7
6. Track 6
7. Track 8

## Progress Log Template

Use this in PR descriptions/commits:

- Scope:
- Checklist IDs completed:
- Suppression delta (`@ts-ignore`, `any`):
- Lint/type/test status:
- Legacy compatibility impact:
- Follow-ups:

## Metric Scoreboard (Update Per Milestone)

- [ ] `M-01` `lint` exits 0
- [ ] `M-02` `type:check` exits 0
- [ ] `M-03` `test:server` exits 0
- [ ] `M-04` `test:client` exits 0
- [ ] `M-05` `@ts-ignore` baseline reduced from 511
- [ ] `M-06` explicit `any` baseline reduced from 453
- [ ] `M-07` internal CJS usage (`module.exports/require`) reduced in modern folders
