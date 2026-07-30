# Passwordless Email and Session Security Checklist Plan

## Objective

Deliver secure email-code signup/sign-in, explicit remembered-session policy, active-session management, and cross-domain tenant continuity without weakening passkey-only privileged step-up or scoped agent authentication.

## Implementation Checklist

### Canonical Contract

- [x] Define passwordless email-code behavior and assurance boundary.
- [x] Define standard and remembered browser-session behavior.
- [x] Define active-session visibility, revocation, and tenant handoff behavior.

### Server Primitives

- [ ] Add expiring, hashed, single-use, superseding email-code challenges.
- [ ] Add configurable OTP expiry, attempt, resend, and rate limits.
- [ ] Add generic non-enumerating request responses and tenant-aware email content.
- [ ] Add verified-email account creation and existing-account sign-in.
- [ ] Add a server-side authenticated web-session registry.
- [ ] Enforce fixed absolute expiry and revoked-session fail-closed behavior.
- [ ] Add list, revoke-one, and revoke-all-other session APIs.
- [ ] Revoke other browser sessions after password change and recovery login.
- [ ] Apply session duration selection to password, passkey, email-code, recovery, OAuth, fast-switch, and handoff flows.

### Client Experience

- [ ] Add a unified email-code request and verification experience.
- [ ] Support new-account username completion only after email verification.
- [ ] Add one-time-code autofill, resend timing, accessible errors, and recovery guidance.
- [ ] Add an explicit "Keep me signed in on this device" control.
- [ ] Preserve password, passkey, OAuth, and recovery-code fallbacks.
- [ ] Return canonical authentication to trusted tenant domains through one-time handoffs.
- [ ] Add active-session listing and revocation to account settings.

### Security and Compatibility

- [ ] Keep email-code assurance ineligible for privileged passkey step-up.
- [ ] Keep email OTP unavailable to API clients and unattended agents.
- [ ] Avoid account enumeration in request and verification responses.
- [ ] Hash codes and handoff secrets; never log or persist raw values.
- [ ] Preserve existing accounts, password sessions, passkeys, and tenant sessions without migration downtime.

### Verification

- [ ] Add service tests for expiry, replay, supersession, attempts, and throttling.
- [ ] Add route tests for existing/new accounts, remembered duration, and generic responses.
- [ ] Add session tests for listing, current-session protection, revocation, and expiry.
- [ ] Add client integration tests for passwordless and session-management flows.
- [ ] Add desktop and mobile browser coverage for canonical and tenant flows.
- [ ] Run lint, type checks, server tests, client tests, OpenAPI checks, and production builds.
- [ ] Complete a separate verification pass before moving this plan to `docs/plans/completed/`.

## Deployment Boundary

- [x] Implement and validate locally only.
- [x] Do not deploy, restart, or modify any production/VPS service without a separate explicit instruction.
