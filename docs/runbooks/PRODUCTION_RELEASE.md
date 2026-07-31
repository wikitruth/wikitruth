# Production Release Runbook

This host-neutral runbook defines the safe release contract for Wikitruth. It
does not contain server names, addresses, credentials, private paths, or secret
values. Those belong in a populated private operator inventory stored outside
the public repository.

## Authorization Boundary

A production release may proceed only when the repository owner explicitly
authorizes deployment in the current request. Implementation, tests, commits,
pushes, merges, or a previous deployment do not provide that authorization.

Production changes include:

- pulling or copying code onto a host;
- installing dependencies or building on a host;
- changing environment files, services, listeners, proxies, TLS, or DNS;
- restarting or activating an application process;
- applying database migrations, imports, cleanup, or restores.

## Required Private Inventory

Before deployment, the operator must have a populated private copy of
`PRIVATE_OPERATOR_INVENTORY_TEMPLATE.md` containing the exact target, service,
database, storage, proxy, backup, verification, and rollback details. Never
commit the populated copy.

## Release Inputs

- `RELEASE_SHA`: immutable commit to deploy.
- `SOURCE_BRANCH`: branch containing the release SHA.
- `PREVIOUS_SHA`: currently active known-good release.
- `PUBLIC_URL`: outside-in verification target.
- `RELEASE_DIR`: immutable target directory for the new release.
- `CURRENT_LINK`: active-release pointer or equivalent service configuration.
- `BACKUP_PATH`: restricted pre-change database archive.
- `SERVICE_NAME`: application service from the private inventory.

Treat every value above as unresolved until confirmed on the target host.

## 1. Prepare and Review

- [ ] Confirm explicit deployment authorization.
- [ ] Confirm the target host and service from the private inventory.
- [ ] Confirm local and remote `RELEASE_SHA` values match.
- [ ] Review the complete outgoing commit range.
- [ ] Confirm the worktree used to build the release is clean.
- [ ] Review migrations, environment changes, persistent assets, and rollback
      compatibility.
- [ ] Confirm capacity and shared-host stop thresholds.
- [ ] Record the active `PREVIOUS_SHA` and current service health.
- [ ] Confirm no secret or populated host inventory is part of the release.

## 2. Validate the Candidate

Use a clean dependency installation and the supported Node version:

```bash
npm ci
npm run runtime:preflight
npm run type:check
npm run test:server -- --runInBand
npm run test:client -- --runInBand
npm run build:server
npm run build:client
```

Run additional migration, security, contract, or browser suites required by the
change. PM2-specific checks apply only to PM2 deployments; systemd and other
service managers require their private inventory checks.

The candidate fails closed if a required check fails. Do not modify the active
runtime to troubleshoot an unqualified build.

## 3. Back Up and Verify Data

- [ ] Create a compressed backup with the production database credentials read
      from their protected runtime source; never print the credentials.
- [ ] Store the archive outside the repository with restrictive permissions.
- [ ] Record its timestamp, size, ownership, mode, and SHA-256 digest.
- [ ] Run an archive listing or dry-run restore to prove readability.
- [ ] Confirm sufficient local and off-host recovery coverage for the release
      risk.
- [ ] Preserve the backup until post-release verification and retention policy
      allow cleanup.

Database backup completion is not database restore proof. Record them as
separate evidence.

## 4. Prepare an Immutable Release

- [ ] Materialize exactly `RELEASE_SHA` into a new immutable release directory.
- [ ] Install production dependencies without modifying the active release.
- [ ] Build server and client assets from the same SHA.
- [ ] Confirm ignored or generated runtime assets required by the application
      are present and reproducible.
- [ ] Link persistent media, backup, log, and runtime state outside the release
      directory.
- [ ] Apply least-privilege ownership and permissions.
- [ ] Record the release SHA in a machine-readable build identity.

Do not build from a dirty checkout and do not rely on an untracked local bundle.

## 5. Audit and Apply Migrations

- [ ] Run every migration in dry-run/read-only mode first.
- [ ] Review exact counts, references, conflicts, and expected no-op behavior.
- [ ] Stop if the audit differs from the approved scope.
- [ ] Apply only approved, idempotent migrations.
- [ ] Re-run audits and invariants after application.
- [ ] Keep spam cleanup and unrelated data repair out of a code release unless
      separately authorized and backed up.

For a staged v1-to-v2 migration, distinguish the initial copy from the final
delta synchronization immediately before cutover.

## 6. Activate

- [ ] Test the new release on its loopback/private listener before exposure.
- [ ] Atomically switch `CURRENT_LINK` or the equivalent service target.
- [ ] Reload or restart only `SERVICE_NAME`.
- [ ] Confirm the process is active, stable, and listening only where intended.
- [ ] Confirm the loaded build identity equals `RELEASE_SHA`.
- [ ] Validate proxy configuration before any reload.
- [ ] Do not change DNS or the primary domain unless separately authorized.

On shared hosts, stop immediately for memory, OOM/swap, CPU, load, disk,
restart, latency/error, or co-tenant regressions defined in the private
inventory.

## 7. Verify Outside In

- [ ] Public HTTPS returns the expected status and certificate.
- [ ] Homepage and one deep link render meaningful content.
- [ ] Authentication entry points load; exercise credentialed flows only when
      safe test credentials are available.
- [ ] The changed user flow passes on desktop and a 390 px mobile viewport.
- [ ] Static assets and persistent media load.
- [ ] Relevant API health and contract checks pass.
- [ ] Service restart count is stable and logs contain no new fatal pattern.
- [ ] Database counts and referential invariants remain expected.
- [ ] The legacy site or other co-tenants remain healthy when in scope.

Process status, listener state, HTTP success, and a working user flow are
different checks. Record each one.

## 8. Roll Back

Rollback triggers include failed health checks, authentication or data-integrity
regression, sustained error/latency increase, resource thresholds, or a broken
required user flow.

Code rollback:

1. Switch the active release pointer back to `PREVIOUS_SHA`.
2. Reload or restart only the affected service.
3. Verify loaded build identity, public HTTPS, logs, and the affected flow.

Data rollback:

1. Stop and assess whether the migration is backward compatible.
2. Do not restore or overwrite production data without explicit authorization.
3. Use the validated backup and the exact database namespace from the private
   inventory.
4. Re-run document counts and referential invariants after restore.

Never delete the failed release or pre-change backup until the incident is
understood and recovery is verified.

## Release Record

Record:

- authorization and operator;
- release and previous SHAs;
- validation commands and outcomes;
- backup path and digest without credentials;
- migrations and counts;
- activation time and service result;
- outside-in checks;
- rollback decision;
- final status using planned, tested, committed, pushed, deployed, and
  live-verified as separate states.
