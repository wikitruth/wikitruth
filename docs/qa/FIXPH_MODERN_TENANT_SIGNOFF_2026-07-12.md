# FixPH Modern Tenant Signoff (2026-07-12)

## Result

`https://fixthephilippines.org` is externally serving the modern Wikitruth application against the existing VPS production database. The tenant-specific Home page and application section navigation passed runtime verification.

## Deployed Revision

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

- The legacy `wikitruth` PM2 process remains on port `8000` for other historical domains.
- The modern checkout is separate at `/opt/wikitruth-modern` and is clean/updatable.
- The environment file is root-only and excluded from Git.
- Nginx rollback copies are stored outside `sites-enabled` under `/root/nginx-backups/` so they cannot be loaded as duplicate server blocks.
