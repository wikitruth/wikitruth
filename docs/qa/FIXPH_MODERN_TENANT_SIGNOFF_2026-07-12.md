# FixPH Modern Tenant Signoff (2026-07-12, Superseded)

## Result

This document preserves evidence from a temporary separate-modern deployment performed on 2026-07-12. That topology was subsequently rolled back at the owner's direction and is not the current production design.

`https://fixthephilippines.org` must point to the same existing shared application instance as `wikitruth.net`. Agents must not recreate, restart, upgrade, or deploy a separate modern FixPH instance unless the user explicitly authorizes that production change in the current request.

## Historical Deployment

- Runtime code revision: `d7cf056d638b4ac16892aee94c0a80ed9b0d1541`
- PM2 process: `wikitruth-modern`
- Node: `22.17.0`
- Listener: private HTTP port `8001`
- Nginx tenant upstream: `http://127.0.0.1:8001`

## Verification Evidence

- Nginx configuration test succeeded before reload.
- PM2 remained `online` after two controlled modernization deployments and stabilization.
- `GET /` returned `200` and the modern React shell.
- `GET /api/home` returned `200`, application id `fixtheph`, and all five configured sections.
- `GET /api/topics/entry/philippine-popular-figures` returned `200` and production topic id `57d51a9cd5cd59576cc88c72`.
- `GET /dist/bundle.js` returned `200`.
- `GET /media/artifacts/59e467f7ea72bc2893f3f83e_gasak.jpg` returned `200` with the expected `1,003,271` bytes before the media alias cleanup; the external alias was rechecked after reload.
- Browser verification rendered Fix The Philippines branding, People, Incidents, Projects, Organizations, Election, and production Latest Posts.
- Clicking the People section reached the slug-only route and canonicalized to `/topics/entry/philippine-popular-figures/57d51a9cd5cd59576cc88c72` without an application error.
- Direct and public `GET /api/auth/me` probes returned `200` with the unauthenticated reader envelope.
- Security headers include `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: no-referrer`.
- The HMAC CSRF secret cookie is signed, HTTP-only, secure, and `SameSite=Lax`; the public token cookie remains readable by the modern client.
- No new runtime error or application-owned browser console error was logged after the modern application reported ready.

## Defect Found During Signoff

The first external section click exposed a merge-redirect middleware cast error for friendly slugs. Commit `7ed69015` now skips redirect collection lookup unless the route identifier is a 24-character Mongo ObjectId, allowing the topic controller to resolve friendly slugs and preserving real merged-entry redirects.

The first dependency-upgrade deployment exposed Kraken's default `express-session` MemoryStore running before the application-owned Mongo session middleware. Commit `d7cf056d` disables Kraken's duplicate cookie parser and session defaults, leaving the signed application cookie parser and `connect-mongo` store as the only active chain. Fresh local and production restarts no longer emit the MemoryStore warning.

## Operational Notes

- The separate `wikitruth-modern` process was stopped after this signoff.
- FixPH routing was restored to the existing shared Wikitruth instance.
- The historical deployment details above are evidence only, not a deployment runbook or authorization to restore that topology.
- Current production topology must be verified read-only before reporting it; any production mutation requires explicit authorization in the current request.
