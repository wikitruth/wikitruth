# Monitoring and Error Tracking Runbook

## Scope

This runbook covers monitoring for migrated React routes (`/app/*`) and supporting API endpoints.

## Signals

- Server request logs from `server/src/middlewares/requestContext.ts`.
- API error envelope logs from `server/src/middlewares/apiError.ts`.
- Client runtime error reports from `POST /api/monitoring/errors`.

## Client Runtime Error Reporting

Enable in production build/runtime:

```bash
REACT_APP_ENVIRONMENT=production
REACT_APP_ERROR_REPORT_ENDPOINT=/api/monitoring/errors
```

The React client registers `window.error` and `unhandledrejection` listeners and sends payloads to the configured endpoint.

## Triage Workflow

1. Filter logs by `event=client.runtime.error` and `requestId` when available.
2. Correlate with backend `api.error` events and deployment timestamp.
3. Classify severity:
   - P0: auth/data integrity broken
   - P1: critical workflow blocked
   - P2: degraded UX with workaround
4. Open issue with:
   - affected route
   - browser/device
   - stack/message
   - release SHA

## Rollback Trigger

Initiate rollback when:

- P0/P1 incidents persist without mitigation.
- Error volume spikes materially above baseline after release.

Follow `docs/frontend/ROLLBACK_PLAN.md`.
