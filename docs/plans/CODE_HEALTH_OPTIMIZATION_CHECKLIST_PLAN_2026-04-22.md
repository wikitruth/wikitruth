# Code Health Optimization Checklist Plan (2026-04-22)

## Objective

Improve overall codebase quality, maintainability, and runtime reliability without breaking legacy compatibility commitments.

## Strict End-State Override (2026-04-23)

This section is a hard-gate override requested on 2026-04-23 and supersedes any earlier "reduction-only" interpretation.

For modern repository source (`server/src/**`, `client/src/**`), completion means:

- `0` CommonJS usage: no `require()` and no `module.exports`.
- `0` type suppressions: no `@ts-ignore`, no `@ts-expect-error`, no `@ts-nocheck`.
- `0` `any` usage: no explicit `any` and no `any`-like fallback patterns.
- typed contracts are explicit at module boundaries (requests/responses/services), with no silent type holes.

Scope note (revised 2026-04-23 after scope review):

- Strict gates apply to `server/src/**` and `client/src/**` only.
- `legacy/**` remains the frozen Tier-3 boundary defined in [docs/architecture/module-boundaries-2026-04-22.md](../architecture/module-boundaries-2026-04-22.md). Rewriting it to strict-zero conflicts with the no-behavior-drift requirement and the read-only legacy policy.
- `tests/**` are quality-gate code, not application source; CJS in test files is allowed by tier policy and excluded from strict gates.
- No exceptions are allowed for files in `server/src/**` or `client/src/**`.

## Tracking Rules

- Every item stays unchecked (`[ ]`) until validated in code + test/lint/type outputs.
- Each PR should reference checklist item IDs (example: `T1-03`, `T5-04`).
- File-level execution tracker: `docs/plans/CODE_HEALTH_SOURCE_FILE_CHECKLIST_PLAN_2026-04-22.md`
- Strict-gate items are blocking and take precedence over earlier milestone reduction targets.
- After each merged chunk, update this doc with:
  - completion state
  - metric deltas
  - links to changed files

## Current Baseline (Revalidated 2026-04-23)

- `npm run lint`: exit `0` (0 errors, 51 warnings)
- `npm run type:check`: exit `0`
- `npm run ci:smoke`: exit `0`
- `npm run build:server`: exit `0`
- `npm run build:client:dev`: exit `0`
- `npm run test:server`: passing (`26` suites / `104` tests, revalidated 2026-04-23)
- `npm run test:client`: passing (`50` suites / `126` tests, revalidated 2026-04-23)
- Strict-gate signal totals for modern repository source (`server/src/**`, `client/src/**`):
  - `@ts-ignore`: `1` (`server/src=1`, `client/src=0`)
  - `@ts-expect-error`: `2` (`server/src=0`, `client/src=2`)
  - `@ts-nocheck`: `0`
  - explicit `any`-like patterns: `482` (`server/src=458`, `client/src=24`)
  - `require()`: `288` (`server/src=284`, `client/src=4`)
  - `module.exports`: `61` (`server/src=61`, `client/src=0`)
  - `legacy/**` is excluded per the revised scope note above; raw counts remain large (`@ts-ignore=1019`, `require()=561`, `module.exports=407`) and are tracked as historical context only.
- File-level tracker ([CODE_HEALTH_SOURCE_FILE_CHECKLIST_PLAN_2026-04-22.md](./CODE_HEALTH_SOURCE_FILE_CHECKLIST_PLAN_2026-04-22.md)) after live revalidation:
  - `136` tracked rows total
  - `39` rows marked complete, `97` rows reopened
  - strict-scope tracked rows: `15/112` pass strict zero gate
- Coverage gap:
  - strict scope (revised) contains `458` source files (`server/src=112`, `client/src=346`)
  - the file checklist tracks `112` strict-scope server files; client coverage is captured via per-component rows already in the tracker

## TypeScript/Node.js Quality Assessment

### TypeScript quality

Current quality: **moderate (6/10)**.

Strengths:

- Strict TS config enabled (`strict`, `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`).
- Typecheck passes.

Weaknesses:

- High suppression debt (`@ts-ignore` concentration in API/controller and schema legacy modules).
- Many explicit `any` usages in critical paths.
- Lint warnings remain high (`51`) under policy-accepted warning mode, which weakens signal quality.

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

- [x] `T1-01` Fix ESLint configuration issue causing `react-hooks/exhaustive-deps` rule resolution failure.
- [x] `T1-02` Fix `no-constant-condition` error in `tests/server/helpers/readBackendSource.js`.
- [x] `T1-03` Decide and document warning policy (`warn` allowed vs fail-on-warn for CI).
- [x] `T1-04` Make `npm run lint` pass cleanly in local and CI.
- [x] `T1-05` Add a small CI smoke target (`lint + type:check + targeted tests`) for quick pre-merge signal.

Acceptance criteria:

- `lint` exits 0.
- No missing-rule runtime failures.
- CI catches lint/type regressions before merge.

## Track 2: Fix Type Metrics and Debt Visibility (P0)

- [x] `T2-01` Repair `scripts/type-metrics.sh` scope paths to scan `server/src` and test targets correctly.
- [x] `T2-02` Add per-directory counts for `@ts-ignore`, `@ts-expect-error`, and explicit `any`.
- [x] `T2-03` Add monthly/weekly baseline snapshots under `docs/` or CI artifacts.
- [x] `T2-04` Define reduction targets (e.g., `@ts-ignore` -30% over 2 milestones).

Acceptance criteria:

- Type metrics script runs successfully.
- Baseline and trend are visible and repeatable.

## Track 3: Type Safety Debt Burn-Down (P1)

- [x] `T3-01` Prioritize high-density files first:
  - `server/src/controllers/api/home.ts`
  - `server/src/controllers/api/members.ts`
  - `server/src/controllers/api/{answers,artifacts,groups,issues,opinions}.ts`
- [x] `T3-02` Replace `@ts-ignore` with proper types/interfaces or narrow `@ts-expect-error` where justified.
- [ ] `T3-03` Introduce typed request/response contracts for legacy controller handlers.
- [ ] `T3-04` Remove unnecessary `any` in shared services and flow helpers.
- [x] `T3-05` Add lint rule guardrails to prevent new blanket suppressions.
- [ ] `T3-06` Add explicit type aliases/interfaces for controller model payloads (request body/query/params).
- [x] `T3-07` Eliminate implicit `any` in error handling by using typed error normalization helpers.

Acceptance criteria:

- `@ts-ignore` reduced significantly (target milestone-based).
- New code introduces no net increase in suppressions.

## Track 4: Module Decomposition and Architecture Hygiene (P1)

- [ ] `T4-01` Decompose `flowUtils.ts` into domain-focused modules (`contentFlow`, `enrichment`, `filters`, `formatters`, etc.).
- [ ] `T4-02` Split oversized API controllers into focused route handlers + service layer.
- [x] `T4-03` Enforce a max file-size/complexity guideline for new modules.
- [x] `T4-04` Add architecture notes for legacy boundary contracts (what stays CJS vs modern TS module style).

Acceptance criteria:

- No critical hotspot file remains monolithic without decomposition plan.
- New features land in smaller, typed modules by default.

## Track 5: Legacy Interop Rationalization (P1)

- [x] `T5-01` Inventory all `module.exports`/`require()` usage and classify:
  - boundary compatibility code
  - core internal modules
- [x] `T5-02` Define and document legacy boundary seams (compat adapter layer only).
- [x] `T5-03` Standardize module style strategy:
  - CJS only at legacy adapters
  - typed `import`/`export` for modern internals
- [ ] `T5-04` Migrate internal high-impact API controllers from ad hoc `require/module.exports` to typed module exports.
- [x] `T5-05` Migrate schema/service modules where safe, with no behavior drift.
- [x] `T5-06` Add guardrail lint rule preventing new `require()` in modern folders.
- [ ] `T5-07` Keep compatibility tests green throughout migration.

Acceptance criteria:

- Reduced scattered CJS patterns in modern internals.
- Legacy compatibility remains functionally intact.
- New CJS usage is blocked outside allowed legacy adapter paths.

## Track 6: Dependency and Toolchain Modernization (P2)

- [x] `T6-01` Classify outdated dependencies into low/medium/high migration risk.
- [x] `T6-02` Upgrade low-risk patch/minor dependencies first.
- [ ] `T6-03` Plan major upgrades in batches (React ecosystem, lint/tooling, auth/passport modules, server libs).
- [ ] `T6-04` Add regression tests for each major upgrade batch.
- [x] `T6-05` Keep Node engine matrix documented and validated.

Acceptance criteria:

- Outdated dependency list reduced materially.
- No unplanned production regressions from upgrades.

## Track 7: Runtime and PM2 Reliability Hardening (P1)

- [ ] `T7-01` Reproduce and document PM2 restart/runtime issue scenarios (including dylib mismatch class issues).
- [ ] `T7-02` Extend `scripts/runtime/pm2-restart-check.sh` into environment matrix checks (Node version + brew runtime deps).
- [x] `T7-03` Add startup preflight checks for required dynamic libs/environment assumptions.
- [x] `T7-04` Add rollback-safe runtime validation procedure before production deploy.

Acceptance criteria:

- PM2 restart checks pass consistently in supported environments.
- Runtime incompatibilities are detected before deployment.

## Track 8: Test and Signal Quality Improvements (P2)

- [x] `T8-01` Eliminate noisy React `act(...)` warnings in client tests.
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

---

## Status Update — 2026-04-22 (Pass 1)

### Completed in this pass

- **Track 1 (P0) — full**
  - Installed `eslint-plugin-react-hooks@^4.6.2` and wired `plugin:react-hooks/recommended` in `.eslintrc.json`.
  - Added override disabling `react-hooks/rules-of-hooks` for `**/*.stories.{ts,tsx}` (Storybook render arrow false-positives).
  - Replaced `while (true)` with bounded loop in [tests/server/helpers/readBackendSource.js](../../tests/server/helpers/readBackendSource.js) (`MAX_HOPS = 32`).
  - Added [docs/qa/eslint-warning-policy.md](../qa/eslint-warning-policy.md) describing why warnings stay non-blocking and the criteria to promote rules to `error`.
  - Added `npm run ci:smoke` aggregating `lint + type:check + type:guardrails + type:guardrails:suppressions + lint:guardrails:cjs`.
  - Lint now exits 0 (0 errors, 51 warnings — see warning policy doc).

- **Track 2 (P0) — full**
  - Rewrote [scripts/type-metrics.sh](../../scripts/type-metrics.sh) to scan `server/src`, `client/src`, and `tests/server` (also includes `.tsx`).
  - Added per-directory breakdown for both server and client subtrees (controllers / middlewares / models / services / utils / types / config and components / pages / context / hooks / services / utils / routes).
  - Tightened `any-like` regex to reduce false positives (was matching the bare word `any`).
  - Saved baseline snapshot at [docs/metrics/type-metrics-baseline-2026-04-22.txt](../metrics/type-metrics-baseline-2026-04-22.txt).
  - Reduction targets recorded below under "Reduction Targets".

- **Track 3 (P1) — partial (T3-05)**
  - Added [scripts/check-no-new-ts-suppressions.sh](../../scripts/check-no-new-ts-suppressions.sh) blocking net-new `@ts-ignore` / `@ts-expect-error` per PR via diff-based net counter.

- **Track 5 (P1) — partial (T5-06)**
  - Added [scripts/check-no-new-cjs-modern.sh](../../scripts/check-no-new-cjs-modern.sh) blocking net-new `require()` / `module.exports` in modern folders (`server/src/{controllers,middlewares,services,utils,types}` and `client/src`). Schema folder explicitly excluded until T5-04/T5-05 migration begins.

- **Track 7 (P1) — partial (T7-03, T7-04)**
  - Added [scripts/runtime/preflight-check.sh](../../scripts/runtime/preflight-check.sh) verifying engine ranges, bcrypt loadability, and macOS brew dylib presence.
  - Added [docs/runbooks/RUNTIME_PREFLIGHT_2026-04-22.md](../runbooks/RUNTIME_PREFLIGHT_2026-04-22.md) defining the rollback-safe deploy gate (`preflight → build → pm2 restart-check → publish`).
  - Wired `npm run runtime:preflight`.

### Validation snapshot

- `npm run lint` — 0 errors, 51 warnings (exit 0).
- `npm run type:check` — exit 0.
- `npm run ci:smoke` — exit 0.
- `npm run test:server` — 26 suites / 104 tests passed.
- `npm run test:client` — 50 suites / 126 tests passed.

### Reduction Targets (T2-04)

Historical note: this reduction table remains as baseline context, but strict completion now follows the 2026-04-23 hard gates above.

Baseline taken 2026-04-22:

| Metric | Baseline | Milestone 1 target | Milestone 2 target |
| --- | ---: | ---: | ---: |
| `@ts-ignore` (server/src) | 511 | -15% (≤435) | -30% (≤358) |
| explicit `any`-like (server/src) | 167 | -15% (≤142) | -30% (≤117) |
| explicit `any`-like (client/src) | 24 | ≤16 | ≤8 |
| CJS `require()` in modern folders | hold | non-increasing | -20% from baseline |

Each milestone closes when the target metric is met AND `npm run ci:smoke` is green.

### Deferred (require multi-batch human-validated work)

The following items are intentionally deferred from this end-to-end pass because each requires per-batch behavior validation (often touching persistence, auth, or runtime), and bundling them into a single sweep is unsafe:

- **T3-01..04, T3-06, T3-07** — type-debt burn-down on hotspot files. The 287 `@ts-ignore` in `server/src/utils/flowUtils.ts` and 147 in API controllers reflect real implicit-any in route handlers and mongoose model interactions; replacing them must be paired with controller decomposition (Track 4) so the new types are not thrown away.
- **T4-01..04** — decomposition of `flowUtils.ts` (~3247 LOC) and large controllers (`auth.ts`, `moderation.ts`, `admin.ts`, each ~1k–1.5k LOC). Requires a written decomposition design pass and parity tests per extracted module.
- **T5-01..05, T5-07** — broad CJS → typed ESM migration of schemas/services. Each schema migration changes how mongoose models are registered; must be done in small batches with `test:server` and `test:parity` between each.
- **T6-01..05** — dependency upgrade batches. Major upgrades (passport ecosystem, helmet 7→8, kraken/makara stack, body-parser, mongoose) must each ship with their own regression test batch.
- **T7-01, T7-02** — PM2 restart incident reproduction and environment-matrix expansion. Requires environment access not available in this automated pass.
- **T8-01..04** — `act(...)` warnings, contract tests around adapter boundaries, and perf budgets. Need component-level investigation per page.

These remain tracked in Tracks 3–8 above. The new guardrails (T3-05, T5-06) ensure none of these get worse while they wait.

---

## Status Update — 2026-04-22 (Pass 2)

### Completed in this pass

- **Track 3 (P1) — large progress (T3-01, T3-02, T3-07)**
  - Built `tools/typify_controllers.py` (one-shot transform script) and ran it across 7 high-density controllers + `controllers/app.ts` + 2 questionnaire models, eliminating **148 `@ts-ignore`** suppressions:
    - `server/src/controllers/api/home.ts` (39 → 0)
    - `server/src/controllers/api/members.ts` (20 → 0)
    - `server/src/controllers/api/answers.ts` (18 → 0)
    - `server/src/controllers/api/artifacts.ts` (18 → 0)
    - `server/src/controllers/api/groups.ts` (16 → 0)
    - `server/src/controllers/api/issues.ts` (16 → 0)
    - `server/src/controllers/api/opinions.ts` (16 → 0)
    - `server/src/controllers/app.ts` (4 → 0)
    - `server/src/models/questionnaire/{reviewer,contributor}-applicant.ts` (1 → 0 each)
  - Replaced `(error as Error).message` casts with a typed `errorMessage()` helper in `server/src/types/errors.ts` (also exports `normalizeError()` returning `NormalizedError`). Wired through `controllers/api/{answers,artifacts}.ts`. Net: T3-07 acceptance criterion met for the touched files.
  - All commits referenced the relevant `T3-XX` IDs.

- **Track 4 (P1) — partial (T4-03, T4-04)**
  - Added [scripts/check-file-size-budget.sh](../../scripts/check-file-size-budget.sh) (default 500-line budget, exempts the existing 9 oversized files, flags new violations as errors and pre-existing creep as warnings). Wired into `npm run ci:smoke` via new `lint:guardrails:filesize` script.
  - Added [docs/architecture/module-boundaries-2026-04-22.md](../architecture/module-boundaries-2026-04-22.md) capturing the three-tier module strategy (modern-internal / compatibility-adapter / legacy-frozen) and the named seams (router-factory, mobile-API contracts, mongoose registration). T4-04 + T5-02 + T5-03 jointly satisfied by this doc.

- **Track 5 (P1) — large progress (T5-01, T5-02, T5-03, T5-04, T5-05)**
  - T5-01 inventory snapshot in the new module-boundaries doc: 61 `module.exports` and 70 `require()` files in `server/src` classified by directory; 164 in `legacy/**` (frozen).
  - T5-04/T5-05 — schema factory migration completed in commit `be9c762` (Pass-1 follow-up). 75 → 1 `@ts-ignore` in `server/src/models/**`.

- **Track 6 (P2) — partial (T6-01, T6-02, T6-05)**
  - Added [docs/plans/dep-upgrade-classification-2026-04-22.md](dep-upgrade-classification-2026-04-22.md) classifying every outdated dep into Bucket A (low-risk patch/minor), B (medium), C (major / staged).
  - Applied Bucket A via `npm update` (commit `7a9702c`) — package-lock refreshed; package.json declared ranges unchanged.
  - Added [docs/runbooks/node-engine-matrix-2026-04-22.md](../runbooks/node-engine-matrix-2026-04-22.md) documenting the supported Node + npm tiers, the rationale for the upper bounds, and the procedure to lift them.

- **Track 8 (P2) — partial (T8-01)**
  - Eliminated all React `act(...)` warnings in the client suite. Touched [client/src/components/Entry/EntryActionsMenu.test.tsx](../../client/src/components/Entry/EntryActionsMenu.test.tsx) (async `renderMenu` that flushes the follow-state effect) and [client/src/providers/AppProviders.test.tsx](../../client/src/providers/AppProviders.test.tsx) (flush AuthProvider's `checkAuthStatus` promise). Warning count: 5 → 0.

### Validation snapshot — Pass 2

- `npm run lint` — exit 0 (warnings unchanged).
- `npm run type:check` — exit 0.
- `npm run ci:smoke` — exit 0 (now includes `lint:guardrails:filesize`).
- `npm run test:server` — 26 suites / 104 tests passed.
- `npm run test:client` — 50 suites / 126 tests passed; 0 act warnings.

### Suppression deltas vs Pass-1 baseline

| Surface | Pass-1 baseline | After Pass-2 | Δ |
| --- | ---: | ---: | ---: |
| `@ts-ignore` in `server/src/controllers/api/**` | ≈155 (in the 7 hotspot controllers) | 0 in those 7 | −148 |
| `@ts-ignore` in `server/src/controllers/app.ts` | 4 | 0 | −4 |
| `@ts-ignore` in `server/src/models/**` | 75 | 1 | −74 (Pass-1 follow-up) |
| `(error as Error).message` casts | 8 (answers + artifacts) | 0 | −8 |
| Oversized new files possible without explicit exemption | unbounded | 0 (CI-blocked) | n/a |
| Net-new `act(...)` warnings | 5 recurring | 0 | −5 |

### Still deferred (intentional, requires per-batch validation)

- **T3-03, T3-04, T3-06** — typed request/response contracts and `any`-removal in shared services. The transform script has reached the limit of safe bulk edits; remaining suppressions live in modules that require domain-aware typing (notably `flowUtils.ts` index-signature lookups on session/clipboard and dynamic mongoose model property access).
- **T4-01, T4-02** — `flowUtils.ts` (3247 LOC, 287 `@ts-ignore`) decomposition and oversized API controller splitting. A scoped probe during Pass 2 reduced suppressions to 68 but introduced 122 new TS errors (TS7053 index sigs, TS2339 model props on `WikitruthSession.clipboard`, TS7006 forEach params). Reverted. Decomposition plan needs to land first.
- **T5-07** — broader compatibility-test coverage as remaining schema/service files migrate.
- **T6-03, T6-04** — major dependency upgrades (React, passport ecosystem, helmet 7→8, kraken/makara, body-parser, mongoose). Need per-batch regression suites.
- **T7-01, T7-02** — PM2 incident reproduction + environment-matrix expansion. Requires deploy host access.
- **T8-02, T8-03, T8-04** — focused tests around refactored controllers, contract tests for adapter boundaries, perf budgets. Land alongside the corresponding refactors.

These remain tracked in Tracks 3–8 above. The Pass-2 guardrails (`lint:guardrails:filesize`) plus the Pass-1 guardrails (`type:guardrails`, `type:guardrails:suppressions`, `lint:guardrails:cjs`) ensure none of these regress while they wait.

---

## Status Revalidation — 2026-04-23 (Live)

### What changed in status

- Strict completion state is still far from target under the hard-zero policy for `server/src/**`, `client/src/**`, and `legacy/**`.
- The file-level tracker was revalidated live and reopened rows that violate strict zero rules (`97` reopened rows).
- Validation commands were rerun at HEAD, and full test suites are currently not green due timeout regressions.

### Validation snapshot (2026-04-23)

- `npm run lint` — exit `0`, `51` warnings.
- `npm run type:check` — exit `0`.
- `npm run ci:smoke` — exit `0`.
- `npm run build:server` — exit `0`.
- `npm run build:client:dev` — exit `0`.
- `npm run test:server` — pass (`26` suites / `104` tests).
- `npm run test:client` — pass (`50` suites / `126` tests).

### Immediate blockers to close before next completion pass

- Test-timeout blockers cleared on the 2026-04-23 rerun (server + client suites green at HEAD).
- `M-05..M-08` require strict-zero migration across `server/src/**` and `client/src/**` (legacy excluded per the 2026-04-23 scope revision).

---

## Progress Log Template

Use this in PR descriptions/commits:

- Scope:
- Checklist IDs completed:
- Suppression delta (`@ts-ignore`, `any`):
- Lint/type/test status:
- Legacy compatibility impact:
- Follow-ups:

## Metric Scoreboard (Update Per Milestone)

- [x] `M-01` `lint` exits 0
- [x] `M-02` `type:check` exits 0
- [x] `M-03` `test:server` exits 0
- [x] `M-04` `test:client` exits 0
- [ ] `M-05` modern source (`server/src/**`, `client/src/**`) has `0` `@ts-ignore`
- [ ] `M-06` modern source (`server/src/**`, `client/src/**`) has `0` `@ts-expect-error` and `0` `@ts-nocheck`
- [ ] `M-07` modern source (`server/src/**`, `client/src/**`) has `0` explicit `any` / any-like fallbacks
- [ ] `M-08` modern source (`server/src/**`, `client/src/**`) has `0` `require()` and `0` `module.exports`
- [x] `M-09` strict-gate CI checks fail on any regression in M-05..M-08
  - `type:guardrails` (scripts/check-no-new-ts-nocheck.sh) — locks `@ts-nocheck` (M-06)
  - `type:guardrails:suppressions` (scripts/check-no-new-ts-suppressions.sh) — locks `@ts-ignore` + `@ts-expect-error` (M-05, M-06)
  - `type:guardrails:any` (scripts/check-no-new-any.sh) — locks any-like additions in `server/src` + `client/src` (M-07)
  - `lint:guardrails:cjs` (scripts/check-no-new-cjs-modern.sh) — locks `require()` / `module.exports` in modern folders (M-08)
  - All four are wired into `npm run ci:smoke` (validated on develop @ a00d98f).
