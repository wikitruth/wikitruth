# Canonical Card: Admin and Operational Controls

## Purpose

Define core administrative control surfaces.

## Admin Domain Controls

- Admin dashboard provides baseline counts (`users`, `accounts`, `categories`, `statuses`).
- Admin APIs support management of:
- users (create/update/delete, password reset, role links)
- accounts (link/unlink users, notes, status updates)
- administrators and admin groups
- categories and statuses

## Moderation Control Plane

- Screeners, reviewers, and administrators can perform governed moderation actions according to role:
- screening and independent factual/ethical verdict review
- reviewer verdict votes and consensus inspection
- reader-signal, issue, appeal, and anonymous-proposal review
- duplicate review, merge, revision, change-request, and rollback workflows
- civic-record status/stage transitions with reasoned history
- Administrators additionally control:
- verdict queue management
- bulk verdict updates
- ownership takeover
- content deletion
- ownership migration with guardrails

## Integrity and Audit

- Privileged actions append hash-chained audit events.
- Admin audit UI/API exposes event history and chain verification.
- Hash-chain verification is tamper-evident; public-key signing is not part of the current contract.

## Backup Operations

- Admin API exposes DB backup status and backup execution endpoints.
- Backup paths are config-driven and created on demand.
- Normal administrator restore performs backup preflight and post-restore verification.
- Empty-database recovery uses a separately guarded one-time install/bootstrap flow with server token, CSRF, confirmation, and rate limiting.

## Permission Invariant

Admin endpoints are explicitly role-gated server-side; operational actions must remain inaccessible to non-admin users even if UI routes are discovered.
