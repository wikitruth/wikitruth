# Passkey Authentication Architecture

## Decision

Wikitruth uses `wikitruth.net` as both the permanent production WebAuthn relying-party ID and the canonical authentication origin. No new authentication subdomain is required. Civic tenants on unrelated domains authenticate through a short-lived, one-time handoff from `https://wikitruth.net`.

Non-production environments must configure their own RP ID and exact origin list. A local credential is test-only and cannot become a production credential.

## Trust Boundaries

```text
Browser authenticator
        |
        | WebAuthn ceremony, exact RP ID and origin
        v
https://wikitruth.net
        |
        | single-use opaque handoff code
        v
configured tenant origin
        |
        | origin-scoped session
        v
Wikitruth and Civic Core APIs
```

- WebAuthn private keys and biometric data remain in the authenticator.
- The server stores public credential material, counters, backup metadata, and lifecycle timestamps.
- Ceremony challenges are short-lived, single-use, server-side records bound to purpose, RP ID, expected origin, and account when applicable.
- Handoff codes are random opaque values; only hashes are stored. They bind to one account, exact target origin, relative return path, assurance state, and expiration.
- Trusted origins come from explicit authentication configuration or active tenant-domain records. Request headers never expand the allowlist.

## Authentication Methods

| Method               | Establishes session | Satisfies passkey step-up          | Intended use                        |
| -------------------- | ------------------- | ---------------------------------- | ----------------------------------- |
| Passkey              | Yes                 | Yes                                | Primary human authentication        |
| Password             | Yes                 | No                                 | Migration and recovery fallback     |
| Configured OAuth     | Yes                 | No                                 | Migration fallback                  |
| Recovery code        | Yes                 | No                                 | Lost-authenticator recovery         |
| Fast switch          | Yes                 | No                                 | Existing trusted-client convenience |
| Tenant handoff       | Yes                 | Preserves recent passkey assurance | Cross-domain session establishment  |
| Agent API credential | No browser session  | No                                 | Scoped unattended software access   |

## Credential Lifecycle

1. An authenticated user requests registration options on the canonical origin.
2. The first credential may be added after a normal authenticated session. Additional credentials require recent passkey assurance or a recent recovery-code session.
3. The server requests a discoverable credential, user verification, and no attestation by default.
4. The response is verified against the consumed challenge, exact expected origin, RP ID, and user handle.
5. The credential public key, ID, counter, transports, device metadata, RP ID, and lifecycle timestamps are persisted.
6. Authentication consumes a separate challenge, verifies the assertion, advances the signature counter, rotates the session ID, and records method and assurance time.
7. Naming and revocation are audited. Privileged administrators cannot revoke below the required credential count while enforcement is active.

## Recovery

- Recovery codes are high-entropy, one-time values returned once and stored only as hashes.
- Regeneration invalidates every previous unused code.
- A recovery-code login establishes a restricted recovery session that can register a replacement passkey but cannot satisfy privileged step-up.
- Password sign-in can be disabled only when at least two active passkeys and unused recovery codes exist.
- Administrators require at least two active credentials before privileged step-up succeeds.
- Email ownership remains governed by the existing account-verification flow; a passkey does not prove legal identity, reputation, email ownership, or editorial authority.

## Privileged Enforcement

The middleware first applies the existing server-side role check, then checks session-bound passkey assurance. Enforcement covers:

- final-say factual and ethical verdict overrides, including bulk overrides;
- API-client creation, rotation, and revocation;
- user role, administrator, and administrator-group mutations;
- content ownership takeover, migration, and deletion;
- database backup and normal administrator restore;
- other endpoints explicitly classified as high impact.

The assurance window is configuration-driven and short. API responses use a stable step-up-required error with a continuation URL so the modern client can prompt without weakening role authorization.

## Cross-Domain Handoff

1. A tenant client discovers the canonical authentication origin from the public passkey configuration endpoint.
2. The browser navigates to `https://wikitruth.net/auth/continue` with an exact target origin and relative return path.
3. The canonical origin authenticates the user, preferably with a passkey.
4. The authenticated session creates a two-minute, single-use handoff code for an allowlisted active tenant origin.
5. The browser returns to the tenant callback route.
6. The tenant exchanges the code from the matching origin. The server atomically consumes it, rotates the tenant session, and preserves recent passkey assurance when present.

Related-origin WebAuthn is not the primary mechanism. Central authentication is more predictable across unrelated country domains and browser versions.

## Persistence

- `PasskeyCredential`: public credential and lifecycle state.
- `AuthCeremony`: expiring registration/authentication challenge.
- `RecoveryCodeSet`: one active hashed recovery-code batch per user.
- `AuthHandoff`: expiring, one-time cross-domain authorization code.

All four collections are private backup data. Authentication lifecycle events use the existing privileged hash-chained event log.

## Runtime Configuration

Production defaults target the current domain:

```text
WEBAUTHN_ENABLED=true
WEBAUTHN_RP_ID=wikitruth.net
WEBAUTHN_RP_NAME=Wikitruth
WEBAUTHN_ORIGINS=https://wikitruth.net
AUTH_CANONICAL_ORIGIN=https://wikitruth.net
WEBAUTHN_STEP_UP_MAX_AGE_SECONDS=600
WEBAUTHN_ADMIN_STEP_UP_REQUIRED=true
```

Local configuration should use a developer-controlled hostname. This reserved
test-domain example keeps workstation-specific infrastructure out of the
repository:

```text
WEBAUTHN_RP_ID=wikitruth.test
WEBAUTHN_ORIGINS=https://wikitruth.test:9443
AUTH_CANONICAL_ORIGIN=https://wikitruth.test:9443
```

## Verification Requirements

- Unit tests: configuration, exact-origin matching, return-path validation, hashes, credential counts, and assurance expiry.
- API tests: registration, authentication, replay rejection, wrong RP/origin rejection, recovery consumption, management restrictions, and handoff replay rejection.
- Authorization tests: every protected mutation requires both its existing role and recent passkey assurance.
- Browser tests: enrollment, passkey login, management, recovery, step-up continuation, and tenant round trip using a virtual authenticator.
- Real-device acceptance: current Safari/iOS, Chrome/Android, desktop Chrome, and at least one roaming security key before production enforcement.
