# Module Boundary & CJS Inventory — 2026-04-22 (Pass 2)

Status: Pass-2 inventory snapshot. Supersedes ad-hoc notes scattered across
`docs/canonical/` and `docs/system-reference/`. Re-run [scripts/type-metrics.sh](../../scripts/type-metrics.sh)
and the `grep` snippets at the bottom of this doc to refresh counts.

Tracks: T4-04, T5-01, T5-02, T5-03.

## Module Style Strategy

Three concentric tiers govern module style. The boundary between them is
enforced by [scripts/check-no-new-cjs-modern.sh](../../scripts/check-no-new-cjs-modern.sh)
(blocks new `require()` in the modern-internal tier).

### 1. Modern-internal tier (typed ESM-style)

Folders:

- `server/src/types/**`
- `server/src/services/**` (modernization in progress)
- `server/src/models/**` (modernization in progress)
- `client/src/**` (production code)

Rules:

- Use `import` / `export` syntax. No `require()` or `module.exports`.
- All exported functions and Express handlers carry explicit types
  (`WikitruthRequest`, `WikitruthResponse`, `WikitruthNext`, domain
  interfaces).
- New files MUST land here unless they explicitly belong in tier 2 or 3.

Allowed exception inside tier 1: client component test files
(`client/src/**/*.test.ts(x)`) MAY use a single inline
`require(...)` call when invoking a fresh module instance after
`jest.resetModules()` or `jest.doMock(...)`. ESM `import` would be
hoisted out of the test body and break determinism. Keep the call
local to the test body and never re-export.

### 2. Compatibility-adapter tier (typed but interop-shaped)

Folders:

- `server/src/controllers/api/**` (Express route registrars wired in
  `server/src/app.ts` via legacy `function (router) { … }` factories)
- `server/src/controllers/app.ts`
- `server/src/middlewares/**` (mounted in `app.ts` via
  `require('./middlewares/...')(app, passport)` boot sequence; cannot
  switch to ESM until the boot module itself does)
- `server/src/utils/flowUtils.ts` (until T4-01 decomposition)
- `server/src/app.ts` (boot loader; intentionally CJS-shaped to control
  legacy load order)

Rules:

- Files MAY use `module.exports = function (router) { … }` so that the
  legacy bootstrap in `app.ts` can keep mounting them as plain factories
  without rewriting the boot sequence.
- Files MUST type the `router` parameter (`Router`) and the `req` / `res`
  / `next` parameters (`WikitruthRequest` / `WikitruthResponse` /
  `WikitruthNext`).
- `require()` of internal modules is allowed only where the target itself
  is still tier-2 or tier-3.
- New code that does not need router-factory shape SHOULD live in tier 1.

### 3. Legacy tier (frozen CJS)

Folders:

- `legacy/server/**`
- `legacy/build/**`
- `legacy/templates/**`
- `legacy/static/**`
- `legacy/compatibility/**`

Rules:

- Treat as read-only. No new files.
- All cross-tier interaction goes through compatibility adapters under
  `server/src/middlewares/` (e.g. `mobileApiContracts.ts`,
  `requestContext.ts`) or via the controller-factory shape in tier 2.
- Modern code MUST NOT import from `legacy/**` directly. This is enforced
  by [scripts/check-modern-no-compat-imports.sh](../../scripts/check-modern-no-compat-imports.sh)
  and [scripts/check-legacy-files-isolated.sh](../../scripts/check-legacy-files-isolated.sh).

## Inventory Snapshot — 2026-04-22

`grep -rln "module.exports" server/src --include="*.ts"` (61 files):

| Folder | Files | Notes |
|---|---|---|
| `controllers/` | 24 | Tier-2 router factories; expected. |
| `services/` | 11 | Migrate to typed `export` over time (T5-05). |
| `models/` | 10 | Mongoose registrations; safe to keep CJS-shaped because they read `app.db.model(...)` indirectly. |
| `utils/` | 8 | Mix of legacy helpers; `flowUtils.ts` flagged for T4-01. |
| `middlewares/` | 7 | Tier-1 in policy; ongoing migration to `export default` / `export const`. |
| `app.ts` | 1 | Boot module; intentionally CJS-shaped to control load order. |

`grep -rln "require(" server/src --include="*.ts"` reports **70 files** —
slightly higher than the `module.exports` count because some tier-1
modules still `require()` legacy helpers (notably `utils/flowUtils.ts`
and several services). All such call sites are tracked under T4-01 and
T5-05.

`grep -rln "module.exports" legacy --include="*.js"` reports **164
files** — frozen, no migration planned.

## Boundary Seams (T5-02)

The modern → legacy boundary is concentrated in three named seams:

1. **Router-factory seam (tier 2 ↔ tier 1).**
   `server/src/app.ts` requires every controller in
   `server/src/controllers/api/**` and invokes it with the express
   `Router` instance. Controllers use the typed
   `WikitruthRequest`/`Response`/`Next` aliases (after T3-01..02).

2. **Mobile-API contract seam (tier 2 ↔ legacy).**
   `server/src/middlewares/mobileApiContracts.ts` and
   `server/src/middlewares/requestContext.ts` translate between modern
   typed envelopes (`ApiErrorEnvelope`, `AuthUser`) and legacy mobile
   client shapes. New shape changes MUST go through this seam.

3. **Mongoose registration seam (tier 2 ↔ tier 3).**
   `server/src/app.ts` registers every schema via
   `app.db.model(name, schema)` from tier-2 model files. Reads use
   `app.db.models[Name]`. Tracked under T5-04/T5-05; conversions land in
   `server/src/types/models.ts`.

## How to keep it healthy

- Run `npm run ci:smoke` before pushing: lint + type-check + four
  guardrails (`type:guardrails`, `type:guardrails:suppressions`,
  `lint:guardrails:cjs`, `lint:guardrails:filesize`).
- When a new module is needed, default to tier 1. Only opt into tier 2
  when the legacy router-factory shape is truly required.
- When touching a tier-2 file, prefer reducing `@ts-ignore` count rather
  than adding suppressions. The diff-based suppression guardrail will
  block net-new ones automatically.
- File-size budget is 500 lines (server+client). New oversized files
  fail CI; pre-existing oversized files emit warnings until decomposed
  under Track 4.
