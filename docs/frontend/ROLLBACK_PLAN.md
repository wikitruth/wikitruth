# React Migration Rollback Plan

## Trigger Conditions

- Critical production outage tied to React routes under `/app`.
- Persistent data corruption or authentication breakage introduced by migration code.
- Repeated 5xx/4xx spikes on API endpoints supporting React UI.

## Rollback Scope

1. Revert to previous known-good commit/tag.
2. Redeploy server and static assets (`public/dist/`, `public/react-app.html`).
3. Disable React route exposure if needed by routing `/app/*` away from React shell.

## Verification

- Legacy routes render correctly.
- Core APIs return expected status codes.
- Authentication/session behavior restored.

## Communication

- Announce incident in engineering channel.
- Document rollback reason and timeline.
- Open follow-up incident ticket.
