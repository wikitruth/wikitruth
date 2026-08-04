# Admin Security, Observability, and Privacy Checklist Plan (2026-08-04)

## Status

Active. This plan covers a local implementation milestone only. It does not
authorize a push, production deployment, remote restart, production-data
operation, or canonical-card change.

## Goal

Resolve the current React Router advisory and complete the next administrator
operations milestone: safer permission management, actionable operational
telemetry, and governed privacy operations.

## Implementation Checklist

### 1. Dependency Security

- [x] Replace the vulnerable React Router package path with the upstream patched
  release and update imports for the supported library-mode API.
- [x] Prove that the repository does not use the affected unstable RSC APIs.
- [x] Run focused router tests, production builds, and a fresh production
  dependency audit; document retained legacy-renderer findings separately.

### 2. Administrator Permissions

- [x] Replace comma-delimited permission/group editing with a catalog-backed,
  searchable, accessible permission matrix and explicit group assignments.
- [x] Add group permission management so inherited access is visible before an
  administrator saves a direct override.
- [x] Preserve direct-over-group precedence, self-change restrictions, and the
  last-capable-administrator invariant in API validation and tests.

### 3. Operational Telemetry and Alerts

- [ ] Store sanitized operational events and periodic health snapshots with
  bounded retention and no request bodies, secrets, tokens, or raw PII.
- [ ] Expose permission-protected health history, recent errors, alert-rule, and
  alert-state APIs with validation, deduplication, and acknowledgement actions.
- [ ] Add a responsive System Operations interface for health trends, recent
  failures, alert configuration, and administrator notification state.

### 4. Privacy Operations

- [ ] Add an audited privacy-request lifecycle for export and anonymization with
  legal-hold, review, approval, execution, rejection, and cancellation controls.
- [ ] Build safe export generation and authenticated, expiring download behavior
  without logging or exposing export contents.
- [ ] Build preview-before-execute anonymization that scrubs account PII, revokes
  sessions, preserves public contribution attribution under a stable pseudonym,
  and refuses protected administrator/legal-hold cases.
- [ ] Add an efficient responsive admin workspace and authenticated self-service
  request entry/status view.

### 5. Verification and Delivery

- [ ] Generate and inspect coordinated admin UI concepts before implementation.
- [ ] Run focused and full relevant server/client tests, type checks, lint,
  source guardrails, production builds, and dependency/security checks.
- [ ] Verify primary workflows in the in-app browser at desktop and 390 px mobile
  widths, including dark mode, keyboard focus, empty/error/loading states, and
  relevant console output.
- [ ] Inspect the accepted concepts and final browser screenshots with
  `view_image`, record the fidelity comparison, then move this plan to
  `docs/plans/completed/` only after a separate verification pass succeeds.

## Guardrails

- Treat canonical cards as authoritative and do not edit them in this scope.
- Fail closed on permissions, alert mutation, export download, and anonymization.
- Store only sanitized telemetry metadata; never store credentials, request
  payloads, authorization headers, email content, export contents, or stack-local
  filesystem paths in operational events.
- Do not run anonymization or export operations against production data in this
  milestone.
- Commit each completed major chunk locally; do not push or deploy without a
  separate explicit request.
