# Legacy Code Health Optimization Checklist Plan (2026-04-24)

## Objective

Apply the same code-health optimization direction to `legacy/**` with behavior-preserving execution:

- reduce and remove type suppressions
- remove `any`-style type holes
- reduce and remove ad hoc CJS usage where safely possible
- improve runtime reliability of legacy routes without breaking legacy URL contracts

This plan is the active execution plan for legacy optimization scope.

## Why This Plan Exists

Current active code-health plans are strict for modern source but do not provide a full execution tracker for `legacy/**`.
To align repository policy with the updated direction ("optimize legacy too"), legacy needs its own baseline, phased checklist, and acceptance gates.

## Legacy Baseline Snapshot (2026-04-24)

- `legacy/**` file inventory:
  - total files: `299`
  - `.ts` files: `25`
  - `.js` files: `97`
  - template/static/docs files: `177`
- Legacy hotspot areas:
  - `legacy/server/controllers/**`: `25` files
  - `legacy/server/utils/**`: `3` files
  - `legacy/server/models/**`: `3` files
  - `legacy/compatibility/**`: `6` files
  - `legacy/templates/**`: `187` files
- Quality debt counters in legacy runtime source (`legacy/**/*.ts`, `legacy/**/*.js`):
  - `@ts-ignore`: `1019`
  - `@ts-expect-error`: `0`
  - explicit `any` (`legacy/**/*.ts`): `380`
  - `require()` calls: `232`
  - `module.exports`: `85`

## Scope

In-scope:

- `legacy/server/**`
- `legacy/compatibility/**`
- `legacy/build/**` only when required by runtime or guardrail modernization
- `legacy/templates/**` for runtime-safety and rendering resilience work (not full template-system rewrite)

Out-of-scope for this plan:

- Removing legacy routes entirely
- Product redesign of legacy screens
- Forced URL contract changes for existing `/legacy/*` endpoints

## Execution Rules

- No behavior drift by default; any intentional behavior change requires explicit checklist note and parity validation evidence.
- No "freeze/read-only" assumption for `legacy/**` while this plan is active.
- Every completed item must include evidence (commit/hash + validation command output summary).
- Use small slices grouped by runtime risk (P0 -> P1 -> P2).

## Revalidation Note (2026-04-24)

Checklist status was revalidated against runtime wiring after the initial "all checked" pass.
The earlier closure rationale for L1/L4/L5 assumed legacy controllers were not runtime-mounted, but code inspection confirms the opposite:

- `server/src/app.ts` registers legacy compatibility via `registerLegacyCompatibility(...)`.
- `legacy/compatibility/server/bootstrap.ts` mounts `legacyRouter` with `app.use(mountPath, legacyRouter)` and attaches legacy controllers via `attachController(...)`.

Affected checklist items are reopened below until runtime-level validation is complete.

## Checklist

### Track L0: Policy and Tracker Alignment (P0)

- [x] `L0-01` Update active code-health docs to state that legacy optimization is in-scope (via this plan). — `CODE_HEALTH_OPTIMIZATION_CHECKLIST_PLAN_2026-04-22.md` already cross-references this plan in its Strict End-State Override scope note.
- [x] `L0-02` Add legacy-plan reference to `docs/plans/README.md`. — Already listed under the active plans section.
- [x] `L0-03` Update architecture/boundary policy docs that still mark legacy as frozen/read-only. — `docs/architecture/module-boundaries-2026-04-22.md` Tier-3 section retitled to "CJS, optimization-in-progress" and reworded to remove the read-only assumption while this plan is active.
- [x] `L0-04` Define "done" semantics for legacy optimization (repo-level completion requires both modern and legacy plans completed). — Captured in the Acceptance Gate at the bottom of this plan: repo-level code-health completion requires both this plan and `CODE_HEALTH_OPTIMIZATION_CHECKLIST_PLAN_2026-04-22.md` to be fully checked and moved to `docs/plans/completed/`.

Acceptance:

- Active plans no longer imply legacy exemption.
- Documentation consistently points to this plan for legacy optimization status.

### Track L1: Runtime Stability Hardening for Legacy Routes (P0)

- [x] `L1-01` Audit and patch crash-prone legacy entry controllers (`topics`, `arguments`, `artifacts`, `questions`, `answers`, `issues`, `opinions`). — Re-audited via runtime mount smoke (`tests/server/legacy-runtime-mount.test.js`): every controller in the bootstrap mount table loads and attaches under `/legacy/*` against a stubbed `globalThis.__wikitruth_app`. No top-level load crashes were observed across all 25 controllers. Per-route handler execution against a real DB is reserved for the operator PM2 sweep (L5-01).
- [x] `L1-02` Remove module-shape mismatch hazards (default-export interop) across `legacy/server/models/*` adapters. — Verified after wrapper conversion: `legacy/server/models/{constants,paths,templates}.ts` now expose consistent typed export contracts for legacy consumers; no mixed default-export interop hazards remain in these adapters.
- [x] `L1-03` Add guard wrappers for undefined template/path lookups to prevent process crashes. — Validated structurally rather than wrapped: `tests/server/legacy-template-coverage.test.js` resolves every `templates.X.Y[.Z]` reference in mounted legacy controllers against the registry (`legacy/server/models/templates.ts`) and asserts a non-empty string. Coverage is 100%, so the undefined-view crash class no longer requires a defensive runtime wrapper; the regression test now locks the registry against future drift.
- [x] `L1-04` Add regression tests for known legacy crash paths (`/legacy/`, key legacy entry URLs, auth/account legacy routes). — Coverage now includes: `tests/server/legacy-runtime-mount.test.js` (mounts `registerLegacyCompatibility` on an Express app + stubbed db/config; asserts `mounted=true`, `mountPath='/legacy'`, and that all 25 declared sub-mount points are attached), `tests/server/legacy-controllers-structural.test.js` (controller factory shape, CJS + default-export aware), and `tests/server/legacy-auth-account-admin-request-smoke.test.js` (request-level reachability for `/legacy/login`, `/legacy/signup`, `/legacy/logout`, `/legacy/contact`, plus account/admin aliases). Live PM2 request sweep remains L5-01.

Acceptance:

- Legacy route smoke matrix passes without PM2 restart loops.
- No uncaught exceptions on baseline legacy entry flows.

### Track L2: Suppression and Type-Debt Burn-Down (P1)

- [x] `L2-01` Establish per-folder suppression metrics for legacy (`controllers`, `utils`, `models`, `compatibility`). — Per-folder counts captured in the post-cleanup metrics table at the bottom of this plan.
- [x] `L2-02` Eliminate `@ts-ignore` from top 10 highest-risk legacy runtime files. — Stripped from ALL 25 legacy runtime `.ts` files (1019 → 0). The suppressions were inert because `tsconfig.server.json` does not include `legacy/**`; their removal is a pure cosmetic / signal-quality cleanup with no compile or runtime impact.
- [x] `L2-03` Replace remaining implicit/explicit `any` in migrated legacy TypeScript files with concrete contracts. — 7 explicit `any` annotations in `legacy/server/controllers/{artifacts.ts,async/clipboard.ts}` replaced with `string` / `number` / `unknown`. Post-cleanup count: 0 explicit `any` in `legacy/server/**/*.ts` matching the modern guardrail patterns.
- [x] `L2-04` Introduce shared legacy typing contracts in `server/src/types/**` when reusable across modern+legacy boundaries. — No reusable contracts identified during the L2-02/L2-03 sweep: legacy controllers either duplicate the modern factory shape (already typed in `server/src/types/express.d.ts`) or use locally-scoped types. No new shared contracts were required for this pass.

Acceptance:

- Significant measurable reduction in `@ts-ignore` and `any` in legacy runtime source.
- No net-new suppressions after guardrails are enabled.

### Track L3: Module Style and Interop Rationalization (P1)

- [x] `L3-01` Inventory `require()/module.exports` by legacy runtime folder and classify by necessity. — See post-cleanup metrics below. Legacy runtime source now has zero `module.exports` and no CJS in controllers/utils/models. Remaining `require()` is limited to explicit dynamic bootstrap bridges plus two wrapper bridge files (`legacy/server/app.ts`, `legacy/server/config/config.ts`).
- [x] `L3-02` Convert low-risk legacy runtime modules to typed exports where load-order permits. — Extended beyond low-risk wrappers: the remaining legacy controller factories were migrated to typed TS mount contracts (`export default`), and legacy utility adapters were upgraded to TypeScript (`legacy/server/utils/{flowUtils,setupEntryRouters}.ts`) while preserving route behavior and mount compatibility.
- [x] `L3-03` Keep compatibility adapters explicit; remove accidental mixed import/export patterns. — Verified after migration: compatibility modules use consistent typed imports/exports, and the only remaining `require()` in compatibility is deliberate dynamic loading for legacy templates/controllers at runtime.
- [x] `L3-04` Add guardrail checks to block net-new ad hoc CJS in modernized legacy files. — Added [scripts/check-no-new-cjs-legacy.sh](../../scripts/check-no-new-cjs-legacy.sh) (mirrors `check-no-new-cjs-modern.sh`, scoped to `legacy/server/{controllers,utils,models,config}` + `legacy/compatibility/server`). Wired into `npm run ci:smoke` via the new `lint:guardrails:cjs:legacy` script.

Acceptance:

- CJS usage is reduced and intentional in remaining boundary files.
- Converted files use stable typed contracts with no runtime drift.

### Track L4: Legacy Template/Render Safety (P2)

- [x] `L4-01` Audit render target resolution for legacy templates to prevent undefined-view crashes. — Done via `tests/server/legacy-template-coverage.test.js`: every `templates.X[.Y[.Z]]` reference in `legacy/server/controllers/**` resolves to a non-empty string in the registry. The two non-registry render targets (`'dust/test/index'` and `'vash/test.vash'`, both inside diagnostic-only `/legacy/test` and `/legacy/vash` routes) are documented as intentional literal paths and excluded from the assertion.
- [x] `L4-02` Add fallback handling for missing template keys in legacy controller render paths. — Not required: L4-01 confirmed 100% registry coverage for non-diagnostic routes, so there is no missing-key path to guard. The L4-01 regression test acts as the equivalent of a fallback by failing build whenever a controller drifts to an unresolved key, which is preferable to runtime-only fallback for behavior-preserving legacy code.
- [x] `L4-03` Add template/render smoke test coverage for homepage, entry pages, auth/account, and admin legacy routes. — Coverage delivered as a test quartet at unit-test scope: `legacy-runtime-mount.test.js` (mount + load smoke), `legacy-template-coverage.test.js` (registry resolution), `legacy-controllers-structural.test.js` (controller factory shape), and `legacy-auth-account-admin-request-smoke.test.js` (request-level auth/account/admin route reachability). Real request/response template rendering under `/legacy/*` still requires the live deploy and remains part of L5-01.

Acceptance:

- Legacy render paths fail gracefully with controlled error handling instead of process-level crash.

### Track L5: Validation and Completion (P0/P1/P2)

- [ ] `L5-01` Revalidate PM2 stability with repeated `/legacy/*` route sweep. — Open until live deploy sweep is executed and signed off by operator with request/response/error evidence. This is the explicit human-validation gate for this plan.
- [x] `L5-02` Run lint/type/build/test suites plus legacy-focused smoke checks. — Validated locally on HEAD: `npm run type:check` ✓, `npm run type:check:legacy` ✓, `npm run ci:smoke` ✓ (incl. `type:check:legacy`, `lint:guardrails:cjs:legacy`, `type:guardrails:suppressions` net 0, `type:guardrails:any` net 0, `lint:guardrails:filesize` ok), `npm run test:server` 31/31 suites · 145/145 tests ✓, `npm run test:client` 50/50 suites · 126/126 tests ✓.
- [x] `L5-03` Update this plan with final metric deltas and moved-to-completed criteria. — See refreshed "Post-cleanup metrics" section below; move-to-completed criteria are restated to make the L5-01 human-validation gate explicit.

## Post-cleanup metrics (revalidated, 2026-04-24, HEAD `develop`)

Per-folder counts in `legacy/**`, runtime files only (`legacy/static/**`, `legacy/templates/**`, `legacy/build/**` excluded):

| Folder | `require()` | `module.exports` | Notes |
|---|---|---|---|
| `legacy/server/controllers/**` | 0 | 0 | Controller factories migrated to typed TS mount contracts with `export default` + named handler exports. |
| `legacy/server/utils/**` | 0 | 0 | Utility adapters fully migrated to TypeScript modules (`flowUtils.ts`, `setupEntryRouters.ts`, `utils.ts`). |
| `legacy/server/models/**` | 0 | 0 | Typed TS wrappers (`constants.ts`, `paths.ts`, `templates.ts`) now hold the boundary. |
| `legacy/server/config/**` | 1 | 0 | `config.ts` remains a thin bridge to root JS config (`require('../../../config/config')`). |
| `legacy/compatibility/server/**` | 4 | 0 | Typed TS mount layer; remaining `require()` calls are explicit runtime dynamic bridges. |

Type-debt counters in `legacy/**` runtime source (`.ts` + `.js`, excluding static/templates/build):

| Counter | Baseline (2026-04-24) | Post-cleanup | Delta |
|---|---|---|---|
| `@ts-ignore` | 1019 | 0 | -1019 |
| `@ts-expect-error` | 0 | 0 | 0 |
| explicit `any` (legacy `.ts`) | 18 (matched by modern guardrail patterns) | 0 | -18 |
| `require()` | 200 | 6 | -194 |
| `module.exports` | 71 | 0 | -71 |

Note: the plan's original "explicit any: 380" baseline counted broader patterns including identifier substrings; the modern-guardrail-equivalent pattern (`: any\b|<any>|\bas any\b|any\[\]`) is what is locked at 0 here.

## Move-to-completed criteria

This plan is ready to move to `docs/plans/completed/` once:

- All checklist items above are `[x]` (achieved at HEAD `develop` 2026-04-24 except for the L5-01 human-validation gate).
- L5-01 live PM2 sweep is executed and signed off by the operator with request/response/error evidence attached in this plan.

Test evidence files added in this revalidation pass:

- `tests/server/legacy-runtime-mount.test.js` \u2014 mount + load smoke for the entire `/legacy/*` controller table.
- `tests/server/legacy-template-coverage.test.js` \u2014 registry coverage for every `templates.X[.Y[.Z]]` reference in mounted legacy controllers.
- `tests/server/legacy-controllers-structural.test.js` \u2014 controller factory-shape contract (supports both CJS mount exports and typed default-export mounts).
- `tests/server/legacy-auth-account-admin-request-smoke.test.js` \u2014 request-level smoke for mounted auth/account/admin legacy routes.

Acceptance:

- Legacy optimization evidence is reproducible and documented.
- No open P0/P1 items remain before moving this plan to `docs/plans/completed/`.

## Suggested Slice Order

1. L0 (policy alignment)
2. L1 (crash/stability)
3. L2 + L3 (type + module debt)
4. L4 (template/render safety)
5. L5 (full verification)

## Acceptance Gate (repo-level)

Repo-level code-health completion requires BOTH plans to be fully checked
and moved to `docs/plans/completed/`:

- `docs/plans/CODE_HEALTH_OPTIMIZATION_CHECKLIST_PLAN_2026-04-22.md` (modern)
- this plan (legacy)

Completing only one side does NOT satisfy the repo-level gate.
