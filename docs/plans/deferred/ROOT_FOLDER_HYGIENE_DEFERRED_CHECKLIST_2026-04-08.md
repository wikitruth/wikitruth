# Root Folder Hygiene Deferred Checklist (2026-04-08)

## Plan Status

Deferred

## Goal

Reduce root-folder clutter and local artifact sprawl without breaking modern or legacy runtime behavior.

## Scope

- Root-level generated artifacts and local machine files.
- Root-level helper files that are not part of runtime startup.
- Documentation updates for repeatable cleanup.

## Checklist

### A. Local Artifact Cleanup (Safe, Non-Repo Breaking)

- [ ] Remove local generated directories before packaging/release snapshots:
  - `.build/`
  - `dist/`
  - `coverage/`
  - `storybook-static/`
  - `test-results/`
  - `node_modules/` (when a full reinstall is acceptable)
- [ ] Remove local system file `.DS_Store` from repository root.
- [ ] Add a scripted cleanup command (for example `npm run clean:local`) for repeatability.

### B. Root-Level Optional File Review

- [ ] Decide keep/remove for `notes.js`.
- [ ] Decide keep/remove for `.replit`.
- [ ] Decide keep/remove for `eplit.nix`.
- [ ] If any file is removed, update any affected docs references.

### C. Validation Gates After Cleanup

- [ ] `npm run dev:server` starts successfully.
- [ ] `npm run dev:client` starts successfully.
- [ ] `npm start` serves legacy + `/app` routes as expected.
- [ ] Basic auth and home-page smoke checks pass.

## Notes

- Keep `app.js` and `server.js` in place unless startup scripts are changed in the same change set.
- This checklist is deferred until cleanup can be bundled with a low-risk maintenance pass.
