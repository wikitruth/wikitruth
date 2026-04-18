# Legacy Compatibility Runtime Runbook

Date: 2026-04-18

## Purpose

Run and verify legacy compatibility after the isolation move to `legacy/compatibility/`, including modern-only fallback mode.

## Runtime Controls

- `LEGACY_COMPATIBILITY_ENABLED=true|false` (default: `true`)
- `LEGACY_COMPATIBILITY_STATIC_ROOT` (default: `legacy/compatibility/static`)
- `LEGACY_COMPATIBILITY_TEMPLATES_ROOT` (default: `legacy/compatibility/templates/jade`)

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
[compat] Mounted static root: legacy/compatibility/static
[compat] enabled=true mounted=true staticRoot=legacy/compatibility/static templatesRoot=legacy/compatibility/templates/jade
```

Compatibility OFF:

```text
[compat] Legacy compatibility disabled (modern-only mode).
[compat] enabled=false mounted=false staticRoot=legacy/compatibility/static templatesRoot=legacy/compatibility/templates/jade
```

## Smoke Checks

Compatibility ON:

```bash
curl -I http://127.0.0.1:8000/
curl -I http://127.0.0.1:8000/about/
curl -I http://127.0.0.1:8000/contact/
curl -I http://127.0.0.1:8000/login/
curl -I http://127.0.0.1:8000/app
curl -I http://127.0.0.1:8000/app/explore
curl -I http://127.0.0.1:8000/api/auth/me
```

Expected: `200` for all listed endpoints.

Compatibility OFF:

```bash
curl -I http://127.0.0.1:8000/
curl -I http://127.0.0.1:8000/login/
curl -I http://127.0.0.1:8000/about/
curl -I http://127.0.0.1:8000/app
curl -I http://127.0.0.1:8000/app/search
```

Expected:
- `/`, `/login/`, `/about/` return `302` with `Location: /app`
- `/app`, `/app/search` return `200`

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
