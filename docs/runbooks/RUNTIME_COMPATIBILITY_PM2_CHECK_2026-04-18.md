# Runtime Compatibility + PM2 Reliability Check (2026-04-18)

Purpose: close `CORE-031` with a repeatable runtime compatibility and restart validation path.

## CI Runtime Matrix

- Workflow: `.github/workflows/ci.yml`
- Job: `runtime-compatibility-matrix`
- Node versions:
  - `22.x`
  - `24.x`
- Checks executed:
  - `npm run build:server`
  - `npm run build:client:dev`
  - `npm run test:server -- tests/server/session-csrf-policy.test.js tests/server/auth-social-session-callbacks.test.ts tests/server/sanitize-content-middleware.test.ts --runInBand`

## Local PM2 Reliability Script

- Script: `scripts/runtime/pm2-restart-check.sh`
- NPM alias: `npm run runtime:pm2:check`
- Behavior:
  - Restarts target process with `pm2 restart <name> --update-env`
  - Waits until PM2 status is `online`
  - Verifies runtime endpoint health (`200` / `401` / redirect) on `/api/auth/me`

Example:

```bash
npm run runtime:pm2:check -- wikitruth http://127.0.0.1:8000/api/auth/me
```
