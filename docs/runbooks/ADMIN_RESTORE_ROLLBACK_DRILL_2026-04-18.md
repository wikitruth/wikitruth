# Admin Restore Runbook + Rollback Drill (2026-04-18)

Purpose: validate modern restore workflow safety (`CORE-030`) and provide a repeatable rollback drill for staging.

## Preconditions

- Admin user session is active.
- Backup artifacts exist in both backup roots:
  - public: `flowUtils.getBackupDir()`
  - private: `path.join(flowUtils.getBackupDir(true), 'users')`
- Both resolved roots are outside the tracked `config/mongodb` fixture tree;
  the runtime rejects paths inside it.
- Collection mapping is configured in `config.mongodb.collections.modelMapping`.

## Restore Safety Checklist

- [x] Restore endpoint requires admin role.
- [x] Restore endpoint requires explicit confirmation text `RESTORE`.
- [x] Restore endpoint rejects no-scope requests (`restorePublicData=false` and `restorePrivateData=false`).
- [x] Restore endpoint logs privileged event `admin.backup.restore`.
- [x] Restore endpoint returns per-scope summary for restored/skipped collections.

## Rollback Drill (Staging)

1. Capture baseline snapshot
   - Trigger backup: `POST /api/admin/db-backup` with `{ "action": "backup" }`.
   - Export the latest backup directory paths from `GET /api/admin/db-backup`.
2. Execute controlled mutation
   - Create/update one non-critical topic and one private user-owned record.
3. Run restore drill
   - `POST /api/admin/db-backup` with:
     - `action: "restore"`
     - `confirmText: "RESTORE"`
     - `restorePublicData: true`
     - `restorePrivateData: true`
4. Validate rollback result
   - Confirm restored records match baseline snapshot.
   - Confirm mutation from step 2 is reverted.
   - Confirm privileged event exists in `/api/admin/audit-events` with `eventType=admin.backup.restore`.
5. Abort criteria
   - If restore summary reports unexpected failures, stop rollout and keep service in maintenance mode.

## Evidence

- Automated restore guardrails:
  - `npm run test:server -- tests/server/admin-db-backup-restore.test.ts --runInBand`
  - Covers confirmation enforcement, scope validation, restore summary behavior, and privileged audit event logging.
