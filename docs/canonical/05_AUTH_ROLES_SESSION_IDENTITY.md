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

## Identity Invariant

Role/identity state is both session and API observable, and elevated moderation/admin actions must rely on role checks, not just client-side route gating.
