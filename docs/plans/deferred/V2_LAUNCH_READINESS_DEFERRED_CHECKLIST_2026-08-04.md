# V2 Launch Readiness Deferred Checklist (2026-08-04)

## Status

Deferred by product-owner direction on 2026-08-04. None of these items are part
of the active implementation milestone, and no checkbox below represents
completed or production-validated behavior.

## Reactivation Rule

Reactivate this plan only after the owner explicitly schedules the relevant V2
cutover, production migration, backup, or large-cohort cleanup milestone. Each
item requires its own dry run, rollback path, and production authorization.

## Deferred Checklist

- [ ] **Legacy security isolation.** Put retained V1 rendering/runtime and its
  vulnerable legacy dependencies behind an explicit isolation boundary with a
  removal date, restricted exposure, and parity-tested fallback. Coordinate with
  `LEGACY_TOOLCHAIN_RETIREMENT_DEFERRED_CHECKLIST_2026-04-08.md` instead of
  duplicating or prematurely removing the legacy renderer.
- [ ] **Migration and cutover control plane.** Add a migration ledger, source and
  target reconciliation, write-freeze/maintenance controls, rehearsal reports,
  resumable execution, rollback gates, and operator sign-off for D1-to-D3 data
  migration and eventual V1-to-V2 cutover.
- [ ] **Verified off-host backups.** Add encrypted scheduled off-host copies,
  retention policy enforcement, independent credentials, integrity verification,
  restore drills, alerting, and evidence that a host loss does not destroy both
  the database and its backups.
- [ ] **Large-scale spam cleanup.** Add saved cleanup cohorts, select-all-matching
  behavior, previewable background batch jobs, deterministic inclusion/exclusion
  rules, progress and failure recovery, and reversible audit evidence before the
  production spam-account cleanup.

## Acceptance Expectations When Reactivated

- Every destructive or externally visible action starts in dry-run/preview mode.
- Database work takes a verified backup first and records source/target counts,
  checksums or equivalent reconciliation evidence, and rollback criteria.
- Bulk cleanup never silently expands beyond the operator-reviewed cohort.
- Production execution follows `docs/runbooks/PRODUCTION_RELEASE.md` and a
  populated private operator inventory that is never committed.
