# Admin Parity QA Checklist (2026-04-18)

Purpose: verify modern admin parity and high-risk mutation paths (`FLOW-034`, `FLOW-032`, `FLOW-035`).

## Coverage Scope

- Routes:
  - `/app/admin/users`
  - `/app/admin/accounts`
  - `/app/admin/administrators`
  - `/app/admin/groups`
  - `/app/admin/categories`
  - `/app/admin/statuses`
  - `/app/admin/verdicts`
  - `/app/admin/db-backup`
  - `/app/admin/audit`
  - `/app/admin/moderation/signals`
- Mutations:
  - user create/update/delete + role links
  - account link/unlink + notes + status + delete
  - administrator permissions/groups/user-link + delete
  - admin-group create/update/delete
  - category create/update/delete
  - status create/update/delete
  - verdict update + bulk verdict update
  - backup start + restore execution

## Functional Checklist

- [x] Admin list pages support filter search + refresh.
- [x] Bulk operations with explicit confirmation exist for high-risk delete routes (users/accounts/administrators/groups/categories/statuses).
- [x] Failure recovery path is visible on admin list pages (retry + failed-delete summaries).
- [x] Restore operation requires explicit operator confirmation text.
- [x] Verdict queue supports filtered listing and bulk updates.
- [x] Audit timeline route renders privileged action stream.

## Validation Commands

- [x] `npm run test:client -- client/src/pages/Admin/AdminPages.test.tsx client/src/pages/Admin/Verdicts/VerdictsPage.test.tsx client/src/services/api/admin.test.ts --runInBand`
- [x] `npm run test:server -- tests/server/admin-db-backup-restore.test.ts tests/server/moderation-ownership-migration.test.js --runInBand`
- [x] `npm run build:client:dev`
- [x] `npm run build:server`

## Notes

- This checklist is focused on parity and risk controls, not visual redesign.
- Additional UX refinements can be layered without changing mutation contracts.
