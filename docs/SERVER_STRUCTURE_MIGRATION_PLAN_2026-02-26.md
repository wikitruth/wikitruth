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

- [ ] Confirm all backend source roots and ownership:
  - `controllers/`
  - `middlewares/`
  - `models/`
  - `services/`
  - `types/`
  - `utils/`
  - `config/`
  - entrypoints: `app.js`, `server.js`
- [ ] Capture baseline metrics:
  - `npm run type:check`
  - `npm run test:server`
  - `npm run test:client` (smoke subset)
- [ ] Freeze migration branch policy (no unrelated refactors while moving paths).

## Target Layout

- [ ] Create target folders:
  - `server/src/controllers/`
  - `server/src/middlewares/`
  - `server/src/models/`
  - `server/src/services/`
  - `server/src/types/`
  - `server/src/utils/`
  - `server/src/config/`
- [ ] Keep temporary root compatibility shims until final cutover.

## Migration Strategy (Phased)

### Phase 0: Safety Rails

- [ ] Add migration ADR in `docs/adr/` describing constraints and rollback.
- [ ] Add import-path lint guard to block new root-level backend imports once phase cutover starts.
- [ ] Add CI check for mixed-path regressions (old + new imports in same moved module).

### Phase 1: Low-Coupling Modules First

- [ ] Move `types/` to `server/src/types/`.
- [ ] Move `services/` to `server/src/services/`.
- [ ] Add root re-export shims:
  - `types/* -> server/src/types/*`
  - `services/* -> server/src/services/*`
- [ ] Update `tsconfig.server.json` include paths for both old+new during transition.
- [ ] Run validation gate:
  - `npm run type:check`
  - `npm run test:server`

### Phase 2: Utility and Middleware Layer

- [ ] Move `utils/` to `server/src/utils/`.
- [ ] Move `middlewares/` to `server/src/middlewares/`.
- [ ] Add root compatibility shims for moved files.
- [ ] Update all direct imports in moved modules to canonical `server/src/...` paths.
- [ ] Validation gate:
  - `npm run type:check`
  - `npm run test:server`
  - Request-context and API envelope tests pass.

### Phase 3: Models and Config

- [ ] Move `models/` to `server/src/models/`.
- [ ] Move `config/` to `server/src/config/`.
- [ ] Keep `config/config.js` compatibility shim until final cutover.
- [ ] Verify Mongoose model bootstrap resolves correctly from new location.
- [ ] Validation gate:
  - server starts locally (`npm start`)
  - `npm run test:server`

### Phase 4: Controllers and API Surface

- [ ] Move `controllers/` to `server/src/controllers/`.
- [ ] Update route mounting imports and any dynamic requires.
- [ ] Keep root `controllers/*` shim modules while legacy references remain.
- [ ] Run full server and selected e2e smoke tests.
- [ ] Validate modern client API calls still pass smoke suite.

### Phase 5: Entrypoint Cutover

- [ ] Introduce canonical server entrypoint in `server/src/` (for example `server/src/app.ts` bootstrap).
- [ ] Convert root `app.js` and `server.js` into thin forwarding shims only.
- [ ] Update npm scripts to point to canonical server workspace.
- [ ] Validate dev/prod scripts:
  - `npm run dev:server`
  - `npm run build:server`
  - `npm run start:dist`

### Phase 6: Cleanup

- [ ] Remove obsolete root backend folders after all imports are migrated.
- [ ] Remove compatibility shims.
- [ ] Tighten `tsconfig.server.json` to only include `server/src/**` (plus required shared files if any).
- [ ] Update docs references and onboarding instructions.

## Compatibility Rules During Migration

- [ ] Every moved file must keep a temporary shim at old path.
- [ ] No circular "new imports old imports new" chains.
- [ ] No behavior changes bundled with path moves.
- [ ] One phase per PR/commit batch with passing validation gate.

## Validation Checklist (Per Phase)

- [ ] Type-check passes: `npm run type:check`
- [ ] Server tests pass: `npm run test:server`
- [ ] OpenAPI contract test passes.
- [ ] API smoke tests pass.
- [ ] No broken runtime startup in local environment.

## Rollback Plan

- [ ] Keep each phase in isolated commits for clean revert.
- [ ] If gate fails, revert only that phase commit set.
- [ ] Do not delete old paths until two consecutive green CI runs post-cutover.

## Exit Criteria

- [ ] Backend source of truth is `server/src/*`.
- [ ] Root-level backend folders removed or reduced to explicit supported shims.
- [ ] Scripts and docs reference canonical server paths.
- [ ] CI green across type-check, server tests, and contract/smoke tests.
