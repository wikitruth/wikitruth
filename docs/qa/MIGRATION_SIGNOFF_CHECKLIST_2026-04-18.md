# Migration Sign-off Checklist (2026-04-18)

Purpose: formal verification artifact for migration closure Track D.

## 1) Build Verification

- [x] `npm run build:server`
- [x] `npm run build:client:dev`

## 2) Core UX + Admin Regression Tests

- [x] `npm run test:client -- client/src/pages/ClipboardPage.test.tsx client/src/pages/ClipboardFlow.integration.test.tsx client/src/components/Entry/EntryActionsMenu.test.tsx client/src/services/api/moderation.test.ts client/src/pages/Admin/AdminPages.test.tsx client/src/pages/Admin/Verdicts/VerdictsPage.test.tsx --runInBand`
- [x] `npm run test:client -- client/src/pages/Admin/AdminPages.test.tsx client/src/pages/Admin/Verdicts/VerdictsPage.test.tsx client/src/services/api/admin.test.ts --runInBand`

## 3) Runtime/Security/Auth Regression Tests

- [x] `npm run test:server -- tests/server/outline-api.test.ts tests/server/moderation-ownership-migration.test.js --runInBand`
- [x] `npm run test:server -- tests/server/admin-db-backup-restore.test.ts tests/server/moderation-ownership-migration.test.js --runInBand`
- [x] `npm run test:server -- tests/server/sanitize-content-middleware.test.ts tests/server/sanitize-html.test.ts tests/server/auth-social-session-callbacks.test.ts tests/server/session-csrf-policy.test.js --runInBand`

## 4) Modern vs Legacy Parity Walkthrough

- [x] Script: `bash scripts/qa/migration-parity-walkthrough.sh https://127.0.0.1:9443`
- [x] Result: PASS for home, explore, auth, admin guard routes, moderation route, and `/api/auth/me`.

## 5) PM2 Restart Reliability

- [x] Command: `npm run runtime:pm2:check -- wikitruth http://127.0.0.1:8000/api/auth/me`
- [x] Result: process online after restart; health endpoint reachable (HTTP `301` due HTTP->HTTPS redirect).

## 6) Remaining Failures / Risks

- [x] No migration blockers found in implemented closure scope.
- [x] Known non-blocking warning remains from Jest/React `act(...)` logging in `EntryActionsMenu` tests.

## Evidence References

- `docs/qa/ADMIN_PARITY_QA_CHECKLIST_2026-04-18.md`
- `docs/runbooks/ADMIN_RESTORE_ROLLBACK_DRILL_2026-04-18.md`
- `docs/runbooks/RUNTIME_COMPATIBILITY_PM2_CHECK_2026-04-18.md`
- `scripts/qa/migration-parity-walkthrough.sh`
- `scripts/qa/migration-parity-walkthrough.mjs`
- `scripts/runtime/pm2-restart-check.sh`
