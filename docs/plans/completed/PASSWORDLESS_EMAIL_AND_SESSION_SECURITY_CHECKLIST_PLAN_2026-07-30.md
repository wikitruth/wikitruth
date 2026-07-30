# Passwordless Email and Session Security Checklist Plan

## Objective

Deliver secure email-code signup/sign-in, explicit remembered-session policy, active-session management, and cross-domain tenant continuity without weakening passkey-only privileged step-up or scoped agent authentication.

## Implementation Checklist

### Canonical Contract

- [x] Define passwordless email-code behavior and assurance boundary.
- [x] Define standard and remembered browser-session behavior.
- [x] Define active-session visibility, revocation, and tenant handoff behavior.

### Server Primitives

- [x] Add expiring, hashed, single-use, superseding email-code challenges.
- [x] Add configurable OTP expiry, attempt, resend, and rate limits.
- [x] Add generic non-enumerating request responses and tenant-aware email content.
- [x] Add verified-email account creation and existing-account sign-in.
- [x] Add a server-side authenticated web-session registry.
- [x] Enforce fixed absolute expiry and revoked-session fail-closed behavior.
- [x] Add list, revoke-one, and revoke-all-other session APIs.
- [x] Revoke other browser sessions after password change and recovery login.
- [x] Apply session duration selection to password, passkey, email-code, recovery, OAuth, fast-switch, and handoff flows.

### Client Experience

- [x] Add a unified email-code request and verification experience.
- [x] Support new-account username completion only after email verification.
- [x] Add one-time-code autofill, resend timing, accessible errors, and recovery guidance.
- [x] Add an explicit "Keep me signed in on this device" control.
- [x] Preserve password, passkey, OAuth, and recovery-code fallbacks.
- [x] Return canonical authentication to trusted tenant domains through one-time handoffs.
- [x] Add active-session listing and revocation to account settings.

### Security and Compatibility

- [x] Keep email-code assurance ineligible for privileged passkey step-up.
- [x] Keep email OTP unavailable to API clients and unattended agents.
- [x] Avoid account enumeration before verified email ownership; keep request responses generic.
- [x] Hash codes and handoff secrets; never log or persist raw values.
- [x] Preserve existing accounts, password sessions, passkeys, and tenant sessions without migration downtime.

### Verification

- [x] Add service tests for expiry, replay, supersession, attempts, and throttling.
- [x] Add route tests for existing/new accounts, remembered duration, and generic responses.
- [x] Add session tests for listing, current-session protection, revocation, and expiry.
- [x] Add client integration tests for passwordless and session-management flows.
- [x] Add desktop and mobile browser coverage for canonical and tenant flows.
- [x] Run lint, type checks, server tests, client tests, OpenAPI checks, and production builds.
- [x] Complete a separate verification pass before moving this plan to `docs/plans/completed/`.

## Deployment Boundary

- [x] Implement and validate locally only.
- [x] Do not deploy, restart, or modify any production/VPS service without a separate explicit instruction.

## Verification Evidence

- Canonical contract: `f6341640 docs(auth): define email code and session security`.
- Server implementation: `836f54ef feat(auth): add email codes and secure sessions`.
- Modern client implementation: `ac40524a feat(auth): add passwordless email and session controls`.
- Full automated regression: 94 server suites / 388 tests and 106 client suites / 287 tests passed after the final explicit expiry, replay, and throttling assertions were added.
- Focused security regression: email challenge, route, session registry, and session route suites passed, including explicit expiry filtering, replay rejection, supersession, attempts, cooldown, hourly throttling, fixed lifetimes, and fail-closed revocation.
- Disposable browser/database QA: two Chromium flows passed for the loopback-resolved FixPH tenant and canonical email-code lifecycle. MongoDB inspection confirmed two consumed challenges, one fixed 30-day remembered session, one fixed 24-hour standard session, and logout revocation.
- Visual QA: canonical sign-in and active-session settings were inspected at desktop and `390x844`; tenant identity and canonical-return link were verified at `390x844` with no horizontal overflow.
- Cleanup: disposable and manual QA identities, accounts, challenges, sessions, notifications, and reputation rows were removed and verified at zero residue; immutable synthetic audit events remain by design.
- Build and contract gates: production server/client build, TypeScript, OpenAPI coverage for 292 mounted operations, CommonJS guardrail, file-size budget, targeted ESLint, and diff checks passed.
- Runtime boundary: only the local workspace PM2 process was restarted. No production, VPS, DNS, proxy, or remote process was changed.

## Verification Result

`PASS` on 2026-07-30. The separate post-implementation verification pass found and fixed tenant-origin preservation, an obsolete login test fixture, and duplicated header authentication state before closure. No pending or deferred checklist item remains.
