# Canonical Card: Auth, Roles, Sessions, and Identity

## Purpose

Define the current authentication and role model.

## Authentication Surface

- Auth API supports:
- signup/login/logout
- password reset (forgot/reset)
- account verification status/resend/confirm
- session user introspection (`/me`)
- available provider introspection (`/providers`)
- WebAuthn passkey registration, authentication, step-up, listing, naming, and revocation
- one-time recovery-code generation and consumption

## Passkeys and Recovery

- `wikitruth.net` is the permanent production WebAuthn relying-party ID and canonical authentication origin.
- Local and non-production origins use explicitly configured, test-only relying-party identities; those credentials are not portable to production.
- Passkeys are optional for general accounts during migration and may become the primary sign-in method after recovery readiness is established.
- User verification is required for passkey authentication. Public enrollment does not require authenticator attestation.
- Accounts may register multiple platform or roaming authenticators. Private keys and biometric information never reach or persist in Wikitruth.
- Passkey removal and adding another passkey require recent authentication assurance, with recovery-code sessions allowed to replace lost credentials.
- Password sign-in may be disabled only after the account has multiple active passkeys and fresh recovery codes; password and configured OAuth providers remain migration fallbacks.
- Administrators must maintain at least two active passkeys when privileged step-up enforcement is enabled.

## Privileged Step-Up

- A recently user-verified passkey is required for configured high-impact administrator actions, including final-say verdict overrides, role and administrator changes, agent-credential lifecycle operations, ownership takeover or migration, deletion, and backup/restore.
- Step-up assurance is short-lived, session-bound, and observable through `/me`; role checks remain independently required.
- Recovery codes, passwords, OAuth callbacks, fast switch, mobile tokens, and agent credentials do not satisfy passkey step-up.

## Cross-Domain Identity

- Unrelated civic-tenant domains do not dynamically join the WebAuthn relying party.
- Tenant applications redirect to the current canonical origin, `https://wikitruth.net`, for passkey authentication and receive a short-lived, single-use authorization handoff.
- Handoff destinations come only from configured or persisted active tenant domains, bind to an exact target origin and relative return path, expire quickly, and cannot be replayed.
- Each target domain establishes its own session after consuming the handoff; session cookies are never shared across unrelated registrable domains.

## Role Model

- Active role set is:
- `reader`
- `contributor`
- optional elevated roles: `screener`, `reviewer`, `admin`
- Active role switching is supported and stored in session preferences.
- Role selection is validated against roles actually granted to the user.

## Session Model

- Server sessions are persisted in MongoDB via `connect-mongo`.
- Session cookie behavior (secure/samesite/httpOnly/maxAge) is config-driven.
- Passport session auth is used for web flows.

## Fast-Switch Identity Flow

- Fast-switch can be enabled per user with PIN-based tokenization.
- Trusted client records back fast-switch cookie validation.
- Fast-switch state can be enabled/disabled and queried via member/auth APIs.

## Mobile Token Flow

- JWT-based mobile token issuance is supported:
- access token
- refresh token
- refresh and revoke endpoints
- TTLs and limits are config-driven.

## Scoped Agent Identity

- Administrators may issue scoped API-client credentials attached to an accountable user.
- API-client secrets are returned once, stored only as hashes, revocable, rotatable, expirable, and rate-limited.
- Credential scopes can reduce but never increase the owner user's role and onboarding authority.
- Agent-authored contributions use normal pending screening, duplicate checks, revisions, and audit attribution.
- Valid bearer credentials are CSRF-exempt; invalid bearer values never bypass CSRF.
- Passkeys authenticate people, not unattended agents. A human administrator must satisfy recent passkey step-up before issuing, rotating, or revoking an agent credential.

## Identity Invariant

Role/identity state is both session and API observable, and elevated moderation/admin actions must rely on role checks, not just client-side route gating.
