# Legacy Compatibility Runtime Runbook

Date: 2026-04-18

## Purpose

Run and verify legacy compatibility with pure legacy code under `legacy/` and bridge-only logic under `legacy/compatibility/`.

## Runtime Controls

- `LEGACY_COMPATIBILITY_ENABLED=true|false` (default: `true`)
- `LEGACY_COMPATIBILITY_STATIC_ROOT` (default: `legacy/static`)
- `LEGACY_COMPATIBILITY_TEMPLATES_ROOT` (default: `legacy/templates`)

## Start Commands

Compatibility ON (default):

```bash
PORT=8000 HTTPS_ENABLED=false LEGACY_COMPATIBILITY_ENABLED=true npm start
```

Compatibility OFF (modern-only mode):

```bash
PORT=8000 HTTPS_ENABLED=false LEGACY_COMPATIBILITY_ENABLED=false npm start
```

## Expected Startup Logs

Compatibility ON:

```text
[compat] Mounted static root: legacy/static
[compat] enabled=true mounted=true staticRoot=legacy/static templatesRoot=legacy/templates
```

Compatibility OFF:

```text
[compat] Legacy compatibility disabled (modern-only mode).
[compat] enabled=false mounted=false staticRoot=legacy/static templatesRoot=legacy/templates
```

## Smoke Checks

Compatibility ON:

```bash
curl -I http://127.0.0.1:8000/
curl -I http://127.0.0.1:8000/legacy/
curl -I http://127.0.0.1:8000/app
curl -I http://127.0.0.1:8000/app/explore
curl -I http://127.0.0.1:8000/explore
curl -I http://127.0.0.1:8000/api/auth/me
```

Expected:
- `/`, `/explore` return `200` (modern shell).
- `/app` returns `302` to `/` and `/app/explore` returns `302` to `/explore`.
- `/legacy/` returns `200` (legacy shell).
- `/api/auth/me` returns `200` when authenticated, otherwise `401`.

Compatibility OFF:

```bash
curl -I http://127.0.0.1:8000/
curl -I http://127.0.0.1:8000/explore
curl -I http://127.0.0.1:8000/app
curl -I http://127.0.0.1:8000/app/search
curl -I http://127.0.0.1:8000/legacy/
```

Expected:
- `/`, `/explore` return `200` (modern shell).
- `/app` and `/app/search` return `302` aliases to root modern routes.
- `/legacy/` returns `404` (legacy compatibility disabled).

## Guardrails

```bash
npm run lint:compat:isolation
npm run lint:compat:imports
```

Both must pass.

## Full Validation Set

```bash
npm run build:server
npm run build:client:dev
npm run test:server
npm run test:client
```

Expected: all commands pass.
