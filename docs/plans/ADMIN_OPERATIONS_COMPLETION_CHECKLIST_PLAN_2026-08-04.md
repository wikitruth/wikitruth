# Admin Operations Completion Checklist Plan

## Goal

Complete the Wikitruth administrator control plane as a safe, understandable,
responsive operations surface. The work must preserve the canonical role and
passkey-assurance boundaries, retain content during account cleanup, and avoid
embedding a web shell or arbitrary database/process controls.

## Design contract

- Use open, list- and table-driven layouts with one compact status strip.
- Group navigation into People, Content and moderation, Security,
  Communications, Tenants, and System operations.
- Keep all important destinations visibly actionable and keyboard accessible.
- Collapse desktop tables into labelled mobile rows rather than requiring
  horizontal scrolling.
- Preview and explain risky actions before enabling their confirmation.
- Support light and dark themes through shared admin design tokens.

## Implementation checklist

### 1. Authorization and lockout safety

- [x] Define a bounded server-side administrator permission catalog.
- [x] Resolve direct and group permissions for every admin request.
- [x] Enforce permissions on admin APIs in addition to the existing admin role.
- [x] Preserve a documented legacy-superadmin fallback for existing admins with
      no explicit permission assignment.
- [x] Expose effective permissions for client navigation and affordances.
- [x] Prevent self-removal and removal/demotion of the last active administrator.
- [x] Add focused authorization and lockout regression tests.

### 2. People, spam cleanup, and account support

- [x] Add purpose-built account-operation state for quarantine/deactivation and
      reversible history without deleting contributions.
- [x] Provide search and filters for state, verification, activity, signup age,
      role, and risk indicators.
- [x] Derive honest account activity/security summaries from persisted data.
- [x] Add bulk-action preview, required reason, blocker checks, audit events,
      session revocation, and a bounded undo flow.
- [x] Add account-security visibility and safe controls for sessions, password
      login, lock state, and verification.
- [x] Replace raw relationship IDs in the primary account-support flow with
      readable identity data.
- [x] Build responsive People operations UI and interaction tests.

### 3. Backup and restore safety

- [x] Store timestamped backup snapshots with immutable manifests, collection
      counts, byte totals, and SHA-256 checksums.
- [x] List snapshots and distinguish completeness, verification, and off-site
      state honestly.
- [x] Add checksum verification and current-versus-snapshot restore preview.
- [x] Add an isolated temporary-database restore test.
- [x] Require a valid preview token, exact confirmation phrase, and automatic
      pre-restore snapshot before any restore.
- [x] Keep legacy recovery compatibility without presenting routine one-click
      restore.
- [x] Add backup-service and route regression tests.

### 4. System health and operational information architecture

- [x] Add a read-only health summary for application, MongoDB, storage, email,
      notifications, backups, audit integrity, and release identity.
- [x] Represent healthy, attention, unavailable, and unknown states without
      fabricating values.
- [x] Redesign the admin dashboard around urgent queues and grouped destinations.
- [x] Ensure every dashboard destination is a real link and permission-aware.
- [x] Add responsive System operations UI for health and backup workflows.
- [x] Retain existing specialist moderation, tenant, email, and audit pages.

### 5. Verification and delivery

- [ ] Run focused server and client tests for every new flow.
- [ ] Run TypeScript checks, lint/guardrails, production builds, and diff checks.
- [ ] Exercise desktop and 390 px mobile admin workflows in the Browser runtime.
- [ ] Verify light/dark rendering, keyboard focus, overflow, console health, and
      preview-before-commit interactions.
- [ ] Compare browser screenshots with the accepted ImageGen direction and
      record the fidelity ledger.
- [ ] Commit completed chunks locally on `develop`; do not push or deploy without
      separate explicit authorization.

## Explicit exclusions

- Production deployment, process restarts, DNS, proxy, or database changes.
- A browser-based shell, arbitrary Mongo query console, or arbitrary PM2 control.
- Permanent deletion as a spam-cleanup default.
- Claims that an off-site copy or provider delivery succeeded without evidence.
- Canonical-card changes; the implementation remains within the existing cards.
