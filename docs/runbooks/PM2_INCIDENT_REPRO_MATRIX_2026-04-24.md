# PM2 Runtime Incident Repro Matrix (2026-04-24)

Purpose: reproduce and quickly classify PM2 restart/runtime incidents (T7-01), especially node/bcrypt/dylib mismatch failures previously seen during host upgrades.

## Preconditions

1. `npm ci`
2. `npm run build:server`
3. `npm run runtime:preflight`

## Incident Matrix

| Incident ID | Trigger | Expected failure signal | Detection command | Recovery |
| --- | --- | --- | --- | --- |
| `PM2-R1` | Restart on unsupported node major | process flaps, startup exceptions | `npm run runtime:pm2:check` | switch to supported node major (`22`/`24`) |
| `PM2-R2` | bcrypt native ABI mismatch | startup fails with native module load errors | `npm run runtime:preflight` | `npm rebuild bcrypt --update-binary` |
| `PM2-R3` | missing Homebrew dylib reference | process restarts but dies immediately | `npm run runtime:preflight` (macOS) | `brew reinstall <formula>` for missing dylib owner |
| `PM2-R4` | PM2 running from stale env snapshot | app stays online but wrong behavior/config | `pm2 env wikitruth` + `pm2 describe wikitruth` | `pm2 restart wikitruth --update-env` after env refresh |
| `PM2-R5` | health endpoint contract drift | restart succeeds, health check fails | `npm run runtime:pm2:check -- wikitruth <health-url>` | restore auth/health middleware contract, redeploy |

## Repro Procedure

1. Capture runtime matrix and restart baseline:
   ```bash
   npm run runtime:pm2:check -- wikitruth http://127.0.0.1:8000/api/auth/me
   ```
2. If failed, collect:
   - `pm2 logs wikitruth --lines 200`
   - `pm2 env wikitruth`
   - `node -v && npm -v`
   - `npm run runtime:preflight`
3. Classify into one of `PM2-R1..PM2-R5`.
4. Apply recovery for that class.
5. Re-run step 1 to close the incident.

## Exit Criteria

- `runtime:preflight` exits `0`.
- `runtime:pm2:check` exits `0`.
- endpoint health status is one of `200/401/30x`.
- `pm2` status remains `online` for at least one full check cycle.
