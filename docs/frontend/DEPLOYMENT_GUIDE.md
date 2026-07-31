# Frontend Deployment Guide

This guide covers frontend build and acceptance concerns. Production activation,
data protection, service management, and rollback follow
`docs/runbooks/PRODUCTION_RELEASE.md` and a populated private operator inventory.

## 1. Build

```bash
npm ci
npm run build:client
```

Build output is written to `public/dist/`.

## 2. Verify (Pre-Deploy)

```bash
npm run test:client -- --runInBand
npm run test:server -- --runInBand
npm run test:e2e
npm run test:coverage -- --runInBand
```

## 3. Staging Rollout

1. Deploy server + static assets to staging.
2. Set environment:
   - `REACT_APP_ENVIRONMENT=production`
   - `REACT_APP_ERROR_REPORT_ENDPOINT=/api/monitoring/errors`
3. Run smoke tests against staging:

```bash
PLAYWRIGHT_BASE_URL=https://staging.example.com npm run test:e2e
```

## 4. User Acceptance Testing

Use the UAT checklist below before production:

- Authentication flows (login/logout/forgot/reset).
- Wiki read/create/edit flows.
- Admin dashboard and list pages.
- Groups/member profile pages.
- Error pages and deep-link refresh under root routes (`/*`, with `/app/*` alias redirects).

## 5. Production Rollout (Gradual)

1. Deploy server + static assets.
2. Enable React app surface on root routes (`/*`) and keep `/app/*` aliases active.
3. Start with internal users, then broaden rollout.
4. Keep legacy routes active for fallback and flow comparison.

## 6. Monitoring and Feedback

Monitor during and after rollout:

- Structured request and API error logs (`request.start`, `request.finish`, `api.error`).
- Client runtime telemetry via `POST /api/monitoring/errors`.
- User feedback triage in release notes/issues.

## 7. Static SEO Assets

- `public/react-app.html`
- `public/sitemap.xml`
- `public/robots.txt`

## 8. Rollback

- Keep previous deployment artifact for `public/dist/`.
- Follow `docs/runbooks/PRODUCTION_RELEASE.md`; do not restore data as part of a
  frontend rollback without separate authorization.
