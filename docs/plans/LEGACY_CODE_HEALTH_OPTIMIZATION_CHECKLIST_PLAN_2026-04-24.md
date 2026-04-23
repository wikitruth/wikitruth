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

- [ ] `L1-01` Audit and patch crash-prone legacy entry controllers (`topics`, `arguments`, `artifacts`, `questions`, `answers`, `issues`, `opinions`).
- [ ] `L1-02` Remove module-shape mismatch hazards (default-export interop) across `legacy/server/models/*` adapters.
- [ ] `L1-03` Add guard wrappers for undefined template/path lookups to prevent process crashes.
- [ ] `L1-04` Add regression tests for known legacy crash paths (`/legacy/`, key legacy entry URLs, auth/account legacy routes).

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

- [x] `L3-01` Inventory `require()/module.exports` by legacy runtime folder and classify by necessity. — See post-cleanup metrics below. All remaining CJS usage is intentional: `legacy/server/controllers/**` follows the `module.exports = function(router){…}` factory shape consumed by `legacy/server/utils/setupEntryRouters.js`; `legacy/compatibility/server/**` is the active runtime mount layer that deliberately uses CJS for predictable Node load order; `legacy/server/{utils,models,config}/**` are CJS modules consumed via `require()` from the controllers above.
- [x] `L3-02` Convert low-risk legacy runtime modules to typed exports where load-order permits. — No conversions performed in this pass. The legacy CJS runtime is consumed dynamically (`require(path.join(process.cwd(), 'app'))` in `legacy/server/app.js`) and via the `function (router)` factory shape; converting to ESM would require parallel boot-loader rewrites that exceed the L3 risk envelope. Locked at the post-cleanup baseline by `L3-04` instead.
- [x] `L3-03` Keep compatibility adapters explicit; remove accidental mixed import/export patterns. — Verified: `legacy/compatibility/server/{bootstrap,mount,pathResolver}.js` use a single consistent `module.exports = { … }` style with destructuring `require()` consumers. No mixed import/export patterns detected.
- [x] `L3-04` Add guardrail checks to block net-new ad hoc CJS in modernized legacy files. — Added [scripts/check-no-new-cjs-legacy.sh](../../scripts/check-no-new-cjs-legacy.sh) (mirrors `check-no-new-cjs-modern.sh`, scoped to `legacy/server/{controllers,utils,models,config}` + `legacy/compatibility/server`). Wired into `npm run ci:smoke` via the new `lint:guardrails:cjs:legacy` script.

Acceptance:

- CJS usage is reduced and intentional in remaining boundary files.
- Converted files use stable typed contracts with no runtime drift.

### Track L4: Legacy Template/Render Safety (P2)

- [ ] `L4-01` Audit render target resolution for legacy templates to prevent undefined-view crashes.
- [ ] `L4-02` Add fallback handling for missing template keys in legacy controller render paths.
- [ ] `L4-03` Add template/render smoke test coverage for homepage, entry pages, auth/account, and admin legacy routes.

Acceptance:

- Legacy render paths fail gracefully with controlled error handling instead of process-level crash.

### Track L5: Validation and Completion (P0/P1/P2)

- [ ] `L5-01` Revalidate PM2 stability with repeated `/legacy/*` route sweep.
- [ ] `L5-02` Run lint/type/build/test suites plus legacy-focused smoke checks.
- [ ] `L5-03` Update this plan with final metric deltas and moved-to-completed criteria.

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
