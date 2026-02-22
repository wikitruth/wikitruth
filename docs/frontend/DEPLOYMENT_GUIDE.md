# Frontend Deployment Guide

## Build

```bash
npm install
npm run build:client
```

Build output is written to `public/dist/`.

## Verify

```bash
npm run test:client -- --runInBand
```

## Runtime

- Start server: `npm start`
- React app route base: `/app`

## Static SEO Assets

- `public/react-app.html`
- `public/sitemap.xml`
- `public/robots.txt`

## Rollback

- Keep previous deployment artifact for `public/dist/`.
- Revert to previous commit and redeploy server + static assets.
