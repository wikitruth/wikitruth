# Server Structure Migration Plan (2026-02-26)

## Objective

Migrate backend code from mixed root folders into a dedicated server workspace:

- Target: `server/src/*`
- Preserve runtime compatibility during transition.
- Avoid big-bang moves that break imports, tests, or production startup.

## Non-Goals

- No behavior changes to API or legacy templates.
- No framework rewrite.
- No forced ESM/CJS module conversion in this migration.

## Status Legend

- `[x]` complete
- `[~]` in progress/partial
- `[ ]` pending

## Current-State Inventory

- [x] Confirm all backend source roots and ownership:
  - `controllers/`
  - `middlewares/`
  - `models/`
  - `services/`
  - `types/`
  - `utils/`
  - `config/`
  - entrypoints: `app.js`, `server.js`
- [x] Capture baseline metrics:
  - `npm run type:check`
  - `npm run test:server`
  - `npm run test:client` (smoke subset)
- [x] Freeze migration branch policy (no unrelated refactors while moving paths).

## Target Layout

- [x] Create target folders:
  - `server/src/controllers/`
  - `server/src/middlewares/`
  - `server/src/models/`
  - `server/src/services/`
  - `server/src/types/`
  - `server/src/utils/`
  - `server/src/config/`
- [x] Keep temporary root compatibility shims until final cutover.

## Migration Strategy (Phased)

### Phase 0: Safety Rails

- [x] Add migration ADR in `docs/adr/` describing constraints and rollback.
- [x] Add import-path lint guard to block new root-level backend imports once phase cutover starts.
- [x] Add CI check for mixed-path regressions (old + new imports in same moved module).

### Phase 1: Low-Coupling Modules First

- [x] Move `types/` to `server/src/types/`.
- [x] Move `services/` to `server/src/services/`.
- [x] Add root re-export shims:
  - `types/* -> server/src/types/*`
  - `services/* -> server/src/services/*`
- [x] Update `tsconfig.server.json` include paths for both old+new during transition.
- [x] Run validation gate:
  - `npm run type:check`
  - `npm run test:server`

### Phase 2: Utility and Middleware Layer

- [x] Move `utils/` to `server/src/utils/`.
- [x] Move `middlewares/` to `server/src/middlewares/`.
- [x] Add root compatibility shims for moved files.
- [x] Update all direct imports in moved modules to canonical `server/src/...` paths.
- [x] Validation gate:
  - `npm run type:check`
  - `npm run test:server`
  - Request-context and API envelope tests pass.

### Phase 3: Models and Config

- [x] Move `models/` to `server/src/models/`.
- [x] Move `config/` to `server/src/config/`.
- [x] Keep `config/config.js` compatibility shim until final cutover.
- [x] Verify Mongoose model bootstrap resolves correctly from new location.
- [x] Validation gate:
  - server starts locally (`npm start`)
  - `npm run test:server`

### Phase 4: Controllers and API Surface

- [x] Move `controllers/` to `server/src/controllers/`.
- [x] Update route mounting imports and any dynamic requires.
- [x] Keep root `controllers/*` shim modules while legacy references remain.
- [x] Run full server and selected e2e smoke tests.
- [x] Validate modern client API calls still pass smoke suite.

### Phase 5: Entrypoint Cutover

- [x] Introduce canonical server entrypoint in `server/src/` (for example `server/src/app.ts` bootstrap).
- [x] Convert root `app.js` and `server.js` into thin forwarding shims only.
- [x] Update npm scripts to point to canonical server workspace.
- [x] Validate dev/prod scripts:
  - `npm run dev:server`
  - `npm run build:server`
  - `npm run start:dist`

### Phase 6: Cleanup

- [~] Remove obsolete root backend folders after all imports are migrated.
- [~] Remove compatibility shims.
- [x] Tighten `tsconfig.server.json` to only include `server/src/**` (plus required shared files if any).
- [x] Update docs references and onboarding instructions.

## Compatibility Rules During Migration

- [x] Every moved file must keep a temporary shim at old path.
- [x] No circular "new imports old imports new" chains.
- [x] No behavior changes bundled with path moves.
- [~] One phase per PR/commit batch with passing validation gate.

## Validation Checklist (Per Phase)

- [x] Type-check passes: `npm run type:check`
- [x] Server tests pass: `npm run test:server`
- [x] OpenAPI contract test passes.
- [x] API smoke tests pass.
- [x] No broken runtime startup in local environment.

## Rollback Plan

- [~] Keep each phase in isolated commits for clean revert.
- [x] If gate fails, revert only that phase commit set.
- [x] Do not delete old paths until two consecutive green CI runs post-cutover.

## Exit Criteria

- [x] Backend source of truth is `server/src/*`.
- [x] Root-level backend folders removed or reduced to explicit supported shims.
- [x] Scripts and docs reference canonical server paths.
- [x] CI green across type-check, server tests, and contract/smoke tests.

## Deferred Cleanup Notes

- Root compatibility shims remain intentionally while legacy template modules still resolve root-level backend paths.
- Final shim removal should happen in a dedicated follow-up once legacy template dependencies are fully cut over.
