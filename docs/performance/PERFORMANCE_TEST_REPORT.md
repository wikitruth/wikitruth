# Performance Test Report

Date: 2026-02-22

## Build-Time Bundle Metrics

Source: `npm run build:client`

- Entrypoint `bundle`: ~180 KiB split across vendor and app entry chunks.
- App entry chunk (`bundle.js`): ~20 KiB (minified).
- Vendor chunk (`170.js`): ~160 KiB (minified).
- Route-level chunks are emitted for lazy-loaded page modules.

## Notes

- Code splitting and lazy route loading are active.
- Additional runtime performance profiling (production telemetry and real-user monitoring) should continue in staging/production environments.
