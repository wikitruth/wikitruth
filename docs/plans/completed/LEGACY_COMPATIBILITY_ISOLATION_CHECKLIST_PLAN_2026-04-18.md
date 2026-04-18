# Legacy Compatibility Isolation Checklist Plan

Date: 2026-04-18  
Scope: move legacy runtime, templates, static assets, and legacy build tooling into an isolated compatibility workspace while preserving legacy route behavior.

## Recommendation

Use `legacy/compatibility/` as the single compatibility root.

Target structure:
- `legacy/compatibility/server/` (legacy-only route/controller modules)
- `legacy/compatibility/templates/` (dust/jade templates)
- `legacy/compatibility/static/` (legacy js/css/layouts/views/components assets)
- `legacy/compatibility/build/` (grunt/tasks/bower-era build scripts)
- `legacy/compatibility/config/` (legacy kraken/view-engine config)
- `legacy/compatibility/contracts/` (path map and compatibility manifest)

## Hard Boundary Rules

- [x] No legacy implementation files remain in modern app folders after migration:
- [x] `client/` contains modern React client code only.
- [x] `server/src/` contains modern server/API code only, except a minimal integration seam that mounts compatibility runtime.
- [x] `public/` contains modern static assets only (`react-app.html`, `dist/`, modern images/icons), with no legacy build chain files.
- [x] Compatibility adapters are centralized under `legacy/compatibility/` and are not duplicated in modern folders.

## Track 1: Inventory and Contract Baseline

- [x] Produce a file inventory manifest of legacy candidates in current root locations (`public/templates`, `public/views`, `public/layouts`, `public/js`, `public/css`, `public/less`, `public/components`, `tasks`, `Gruntfile.js`, bower/jshint configs).
- [x] Map every runtime reference that currently points to legacy paths (server config, route loaders, devtools, test contracts).
- [x] Classify each path as `legacy-only`, `modern-only`, or `shared`.
- [x] Create `legacy/compatibility/contracts/path-map.json` with old-path -> new-path mapping.
- [x] Define explicit ownership table for moved modules and adapters.

## Track 2: Compatibility Workspace Bootstrap

- [x] Create compatibility root folders under `legacy/compatibility/`.
- [x] Add compatibility README with boundaries, startup flow, and no-mix policy.
- [x] Add a compatibility bootstrap module that can be mounted from modern server with a single import seam.
- [x] Add a compatibility path resolver utility so old routes keep working without exposing legacy internals in modern code.

## Track 3: Server-Side Legacy Extraction

- [x] Move legacy page-route loaders/controllers out of modern controller tree into `legacy/compatibility/server/`.
- [x] Keep modern API controllers (`server/src/controllers/api/**`) in place.
- [x] Update route wiring to load legacy routes from compatibility root.
- [x] Keep current legacy URLs stable (no URL changes for `/`, `/about`, `/contact`, `/login`, legacy entry pages).
- [x] Keep social auth callbacks and account legacy pages functional through compatibility loader.

## Track 4: Template and Static Legacy Extraction

- [x] Move Dust/Jade templates to `legacy/compatibility/templates/`.
- [x] Move legacy static runtime assets to `legacy/compatibility/static/`.
- [x] Update kraken/view-engine config to point to compatibility template paths.
- [x] Add static mount aliases so legacy URL paths continue to resolve.
- [x] Verify there are no direct legacy file reads from `public/templates` after cutover.

## Track 5: Legacy Build Toolchain Extraction

- [x] Move `Gruntfile.js` and `tasks/` into `legacy/compatibility/build/`.
- [x] Move bower/jshint-era config files into compatibility build folder.
- [x] Update `npm run start:legacy-grunt` to execute toolchain from compatibility location.
- [x] Ensure modern build scripts (`build:client`, `dev:client`, `build:server`) are unaffected by compatibility tooling.
- [x] Ensure compatibility build output writes only to compatibility-owned locations (or controlled bridge outputs).

## Track 6: URL and Runtime Compatibility Layer

- [x] Implement compatibility mount module that serves legacy static/template/controller paths from `legacy/compatibility`.
- [x] Keep modern `/app` routing unchanged and prioritized correctly.
- [x] Add explicit fallback behavior when compatibility module is disabled (modern-only mode).
- [x] Add runtime checks/logs that show compatibility module status and mounted roots on startup.

## Track 7: Verification Matrix

- [x] Legacy route smoke checks pass (`/`, `/about`, `/contact`, `/login`, key legacy entry pages).
- [x] Modern route smoke checks pass (`/app`, `/app/explore`, `/app/search`, `/app/visualize`, key modern entry pages).
- [x] Auth/session checks pass for both legacy and modern flows.
- [x] Social login callback routes remain functional.
- [x] Existing route regression tests pass (`tests/server/route-regression.test.js`, `tests/server/route-contracts.test.js`, `tests/server/app-shell.test.js`).
- [x] Build/test suite pass for server and client (`npm run build:server`, `npm run build:client:dev`, `npm run test:server`, `npm run test:client`).

## Track 8: Cleanup and Enforcement

- [x] Remove or archive old root legacy locations after compatibility cutover validation.
- [x] Add guardrail script to fail CI if new legacy files are added outside `legacy/compatibility/`.
- [x] Add guardrail script to fail CI if modern folders import compatibility internals directly (except approved seam).
- [x] Update `.gitignore`/cleanup scripts to reflect new compatibility layout.

## Track 9: Documentation and Handoff

- [x] Update root README with new compatibility architecture and commands.
- [x] Add `docs/runbooks/LEGACY_COMPATIBILITY_RUNTIME_RUNBOOK_2026-04-18.md`.
- [x] Add migration report with before/after path map and verification evidence.
- [x] Update plans index and mark this checklist as completed only after verification pass.

## Exit Criteria

- [x] Legacy functionality works at existing legacy URLs using only files under `legacy/compatibility/`.
- [x] Modern runtime folders (`client`, `server/src`, `public`) contain only modern code/assets, except documented mount seam.
- [x] No critical regression in auth/session, entry rendering, or admin routes.
- [x] Verification evidence is captured and linked in docs.
