# Legacy Toolchain Retirement Deferred Checklist (2026-04-08)

## Plan Status

Deferred. The decision to retain legacy rendering and keep its retirement outside the active execution queue was reaffirmed on 2026-07-13.

## Goal

Retire legacy Grunt/Bower/JSHint-era root tooling files only when both modern and legacy FE flows remain operational with documented fallback behavior.

## Scope

- Legacy build/tooling files at repository root.
- Package scripts/dependencies tied to legacy build chain.
- Legacy FE runtime compatibility verification.

## Checklist

### A. Preconditions

- [ ] Confirm policy for legacy fallback command `npm run start:legacy-grunt` (retain temporarily or retire).
- [ ] Confirm legacy FE comparison mode still required by product/QA.
- [ ] Confirm ownership for legacy-retirement rollout and rollback windows.

### B. Candidate Files for Removal (Only After Preconditions)

- [ ] `Gruntfile.js`
- [ ] `bower.json`
- [ ] `.bowerrc`
- [ ] `.jshintrc`
- [ ] `.jshintrc-client`
- [ ] `.jshintrc-server`
- [ ] `.babelrc` (only if no remaining root Babel usage)

### C. Package and Script Cleanup

- [ ] Remove or replace `start:legacy-grunt` script if fallback is retired.
- [ ] Remove obsolete Grunt/Bower/JSHint dependencies from `package.json`.
- [ ] Remove obsolete tasks under `tasks/` only after parity replacement is verified.
- [ ] Update README/docs to reflect final supported build/runtime paths.

### D. Required Validation Before Merge

- [ ] Modern FE: `/app` loads and key routes pass smoke tests.
- [ ] Legacy FE: server-rendered routes still render (if legacy comparison mode remains enabled).
- [ ] `npm run dev:all` and `npm start` both succeed.
- [ ] Auth + session + core content route smoke checks pass.

## Guardrails

- Do not remove `app.js` and `server.js` in this deferred plan.
- Do not remove legacy static assets under `public/layouts`, `public/views`, and `public/js` unless replacement and parity validation are complete.
