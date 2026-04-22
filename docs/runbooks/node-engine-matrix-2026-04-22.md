# Node Engine Matrix — 2026-04-22 (Pass 2)

Track: T6-05.

This document records the supported Node.js / npm matrix declared in
`package.json` (`engines`) plus the runtime constraints validated by
`scripts/runtime/preflight-check.sh` and `scripts/runtime/pm2-restart-check.sh`.

## Declared engines

```json
"engines": {
  "node": ">=22.4.1 <25",
  "npm":  ">=10.8.1 <12"
}
```

## Tested combinations

| Tier | Node | npm | Notes |
|---|---|---|---|
| Production | 22.4.x LTS | 10.8.x | Primary deploy target. PM2 + brew runtime deps validated by `npm run runtime:pm2:check`. |
| Production-tracking | latest 22.x LTS | 10.8.x or 11.x | Tracks security patches inside the LTS line. |
| Local-development (supported) | 22.x LTS, 24.x current | 10.8+ / 11+ | Use Volta/nvm to pin per-checkout. |
| Local-development (best-effort) | 25.x | 11.x | Above declared range; agent test runs use this and tolerate `EBADENGINE` warnings. CI must pin to a supported tier. |

## Why the upper bound

- `<25` keeps the matrix inside the actively-tested LTS / current line.
  Upgrading the upper bound requires:
  1. Running `npm install` cleanly (no peer warnings on the new version).
  2. `npm run ci:smoke` and `npm run test:server` green.
  3. `npm run runtime:pm2:check` green on the deploy host (catches
     dylib mismatches that surface as PM2 restart loops — see Track 7).
- `<12` for npm avoids changes in the workspace/peer-resolution algorithm
  that have historically caused dependency drift between local and CI.

## Out-of-range usage

Running on Node 25 or npm 12 is allowed for local exploration but you
will see `EBADENGINE` warnings on `npm install`. Treat them as advisory
unless `ci:smoke` or `test:server` regress.

## How to update the matrix

1. Bump `engines.node` / `engines.npm` in `package.json`.
2. Update the table above with the new tier.
3. Re-run `npm install` from a clean `node_modules`.
4. Run `npm run ci:smoke && npm run test:server && npm run test:client`.
5. On deploy host(s): `npm run runtime:preflight && npm run runtime:pm2:check`.
6. Document the change under [docs/runbooks/](../runbooks/) if it affects
   deploy procedure.
