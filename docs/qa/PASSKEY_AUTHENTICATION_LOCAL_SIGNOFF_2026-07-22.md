# Passkey Authentication Local Signoff

Date: 2026-07-22

Environment: local Wikitruth checkout and local development database

Local origin: private development hostname on HTTPS port `9443` (hostname redacted)

Production contract: RP ID `wikitruth.net`, canonical origin `https://wikitruth.net`

Production deployment: not performed

## Scope

This signoff covers passwordless signup, passkey login, credential enrollment and management, recovery codes, password fallback controls, recent-passkey assurance, protected administrator and moderation mutations, agent-credential separation, exact-origin tenant handoffs, replay prevention, API compatibility, and the modern account UI.

## Automated Verification

| Check | Result |
| --- | --- |
| `npm test` | Pass: 77 server suites / 330 tests and 93 client suites / 229 tests |
| `npm run ci:smoke` | Pass: lint, modern and legacy type checks, suppression/`any`/CommonJS guardrails, and file-size guardrail |
| `npm run openapi:check` | Pass: 248 mounted operations covered |
| `npm run docs:drift` | Pass |
| `npm run build` | Pass: server TypeScript and production client bundle |
| `git diff --check` | Pass |
| Focused security suites | Pass: assurance, recovery hashing, privileged admin policy, handoff exact-origin/single-use, ceremony replay, and account-reference handling |
| Focused client suites | Pass: WebAuthn browser service, automatic step-up retry, account security panel, auth context, login/signup integration, request clients, and routes |

The repository's pre-existing file-size warnings remain confined to files already above the comparison baseline. No new file exceeded the enforced budget.

## Browser Verification

Command:

```bash
PLAYWRIGHT_BASE_URL=https://wikitruth.test:9443 npm run test:e2e:passkeys
```

Result: Pass in Chromium using CDP virtual authenticators.

The browser journey verified:

1. Passwordless signup with a discoverable, user-verified credential.
2. Redirect to account security instead of racing to the home page.
3. Enrollment of a second distinct authenticator.
4. One-time recovery-code generation and display.
5. Logout completion.
6. Password-free passkey login.
7. `/api/auth/me` reporting the expected user and `passkey` assurance method.

The browser run exposed and led to fixes for a passwordless-signup redirect race, ObjectId reference normalization in account settings, and duplicate TTL index declarations.

## API Verification

Both compatibility paths returned the configured local passkey contract with HTTP 200:

- `/api/auth/passkeys/config`
- `/api/v1/auth/passkeys/config`

OpenAPI includes the 16 passkey, recovery, password-fallback, and tenant-handoff operations added by this work.

## Security Findings Closed

- Challenges and handoff codes are atomically consumed and reject replay.
- Only challenge hashes and handoff-code hashes are persisted.
- WebAuthn verification requires exact configured origin, RP ID, and user verification.
- Tenant handoffs bind exact trusted origins and safe relative return paths.
- Sessions rotate after authentication and handoff exchange.
- Administrator mutations require recent human passkey assurance when enforcement is enabled.
- Administrator accounts must retain two active passkeys under enforcement.
- Agent credentials cannot satisfy human passkey step-up.
- Password login cannot be disabled until email verification, two passkeys, and recovery codes are available.

## Remaining Rollout Gates

These are intentionally outside this completed local implementation:

- No production or VPS files, processes, proxies, DNS, or databases were changed.
- Production configuration and proxy/cookie validation remain required before release.
- Existing administrators must enroll at least two real credentials before production enforcement.
- Real phones, platform authenticators, roaming security keys, and account-recovery drills remain production acceptance work.
- A future production deployment requires a new explicit user instruction.
