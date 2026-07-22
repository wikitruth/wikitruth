# Passkey Authentication Checklist Plan

## Objective

Add standards-based passkey authentication to Wikitruth using the current `wikitruth.net` domain, protect high-impact human actions with recent passkey assurance, preserve scoped agent authentication, and support unrelated civic-tenant domains through one-time central-authentication handoffs.

Production deployment is excluded from this plan and requires a separate explicit instruction.

## Checklist

### Contract and Architecture

- [x] Establish `wikitruth.net` as the permanent production RP ID and canonical authentication origin.
- [x] Define passkey, recovery, assurance, agent-auth, and tenant-handoff boundaries in canonical cards.
- [x] Record detailed persistence, security, configuration, rollout, and verification decisions.

### Server Foundation

- [x] Add maintained WebAuthn server/browser dependencies.
- [x] Add passkey credential, ceremony, recovery-code, and authentication-handoff models and backup coverage.
- [x] Add strict RP/origin configuration and trusted tenant-origin resolution.
- [x] Add session rotation and authentication-assurance helpers.
- [ ] Add privileged audit events for passkey, recovery, and handoff lifecycle changes.

### Authentication API

- [ ] Add public capability/configuration discovery.
- [ ] Add registration options and verification.
- [ ] Add authentication/step-up options and verification.
- [ ] Add credential list, rename, and revoke operations.
- [ ] Add recovery-code generation, status, and one-time login.
- [ ] Add password-login disable/enable safeguards.
- [ ] Add central-origin handoff creation and exact-target consumption.
- [ ] Publish the stable `/api/v1` contract and preserve `/api` compatibility.

### Modern Client

- [ ] Add passkey sign-in and conditional tenant redirect behavior.
- [ ] Add account-security enrollment and credential-management UI.
- [ ] Add recovery-code generation and one-time display UI.
- [ ] Add password-login control with recovery-readiness checks.
- [ ] Add reusable privileged step-up prompt and retry behavior.
- [ ] Add central continuation and tenant callback routes.
- [ ] Keep agent credentials visibly separate from human passkeys.

### Enforcement

- [ ] Require recent passkey assurance for final-say overrides.
- [ ] Require recent passkey assurance for agent-credential lifecycle operations.
- [ ] Require recent passkey assurance for user/admin role changes.
- [ ] Require recent passkey assurance for ownership takeover, migration, deletion, and administrator backup/restore.
- [ ] Preserve existing independent role, scope, onboarding, CSRF, and audit checks.

### Verification

- [ ] Add server unit and integration coverage for happy paths and security failures.
- [ ] Add client service, component, route, and interaction coverage.
- [ ] Add virtual-authenticator browser coverage for local enrollment and login.
- [ ] Add tenant handoff and replay coverage.
- [ ] Run server/client tests, type checks, guardrails, builds, OpenAPI synchronization, and diff checks.
- [ ] Record formal local QA evidence in `docs/qa/`.
- [ ] Complete a separate verification pass with no pending or deferred implementation items.

## Rollout Gate

Implementation and local validation do not authorize production deployment. Before production enforcement:

- confirm the final production origin is exactly `https://wikitruth.net`;
- configure production secrets, HTTPS, proxy trust, session cookies, and exact WebAuthn origins;
- enroll at least two passkeys for every administrator, including a recovery authenticator;
- validate account recovery and break-glass operations;
- complete real-device and roaming-key acceptance;
- explicitly authorize the deployment in a new request.
