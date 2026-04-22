# Parity Test Credentials Runbook (2026-04-22)

## Purpose

Set up reusable test credentials for modern-vs-legacy parity checks, including privileged-role parity coverage.

## What This Supports

- Stable **reader/contributor baseline** account.
- Stable **privileged parity** account (screener + reviewer, with optional admin-role link).
- Repeatable setup command for local/dev/staging environments.

## Required Environment

```bash
export WT_ADMIN_USERNAME="<existing-admin-username-or-email>"
export WT_ADMIN_PASSWORD="<existing-admin-password>"
```

## Recommended Parity Credential Environment

```bash
export WT_PARITY_TEST_PASSWORD="<shared-test-password>"

export WT_PARITY_READER_USERNAME="wt_parity_reader"
export WT_PARITY_READER_EMAIL="wt.parity.reader@example.test"

export WT_PARITY_PRIVILEGED_USERNAME="wt_parity_privileged"
export WT_PARITY_PRIVILEGED_EMAIL="wt.parity.privileged@example.test"
```

Optional overrides:

```bash
export WT_PARITY_READER_PASSWORD="<reader-password>"
export WT_PARITY_PRIVILEGED_PASSWORD="<privileged-password>"
export WT_PARITY_ADMIN_RECORD_ID="<admin-record-id>"
export WT_PARITY_REQUIRE_ADMIN_ROLE=1
```

## Setup Command

```bash
npm run test:parity:setup-creds -- https://<your-host>:9443
```

Optional custom output directory:

```bash
node scripts/qa/setup-parity-test-creds.mjs https://<your-host>:9443 docs/qa/artifacts
```

## Script Behavior

- Logs in through `/api/auth/login` using admin credentials.
- Upserts two parity users in `/api/admin/users`.
- Resets passwords on every run (idempotent, deterministic for test ops).
- Enforces expected screener/reviewer flags.
- Attempts admin-role linking for privileged user:
  - Uses `WT_PARITY_ADMIN_RECORD_ID` when provided.
  - Otherwise auto-selects the first unlinked admin record.
- Writes a non-secret run summary to:
  - `docs/qa/artifacts/parity-test-creds-last-run.json`

## Use With Authenticated Parity Capture

```bash
export WT_PARITY_USERNAME="$WT_PARITY_PRIVILEGED_USERNAME"
export WT_PARITY_PASSWORD="$WT_PARITY_PRIVILEGED_PASSWORD"
export WT_PARITY_EMAIL="$WT_PARITY_PRIVILEGED_EMAIL"

npm run test:parity:authenticated -- https://<your-host>:9443
```
