# UAT Checklist (React Migration)

Date: 2026-02-22

## Access and Session

- [x] Login succeeds and redirects correctly.
- [x] Logout clears session and returns expected response.
- [x] Auth status endpoint (`/api/auth/me`) handles authenticated/anonymous states.

## Wiki Flows

- [x] Core list/detail routes under `/app` render.
- [x] Route refresh/deep link behavior works under React Router catch-all.
- [x] API-backed data views handle success/error payloads.

## Admin Flows

- [x] Admin dashboard loads.
- [x] Admin users/accounts/administrators/groups/categories/statuses endpoints mapped.

## Cross-Platform

- [x] Desktop browser project coverage (Chromium/Firefox/WebKit).
- [x] Mobile browser project coverage (Pixel profile).

## Operations

- [x] Rollback plan documented.
- [x] Monitoring endpoint and client runtime error reporting available.
