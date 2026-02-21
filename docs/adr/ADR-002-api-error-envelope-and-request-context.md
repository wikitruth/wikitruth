# ADR-002: API Error Envelope and Request Correlation

- Status: Accepted
- Date: 2026-02-21

## Context

The API layer had inconsistent error payloads and limited request correlation in logs. Some handlers returned inline error JSON, while others relied on default Express behavior. This made debugging and client error handling inconsistent.

## Decision

Adopt a centralized API error strategy for `/api/*`:

1. Add shared async route wrapping so async handler failures flow through middleware consistently.
2. Use one API error middleware that returns a stable JSON envelope with:
   - `error.code`
   - `error.message`
   - `error.requestId`
3. Add request-context middleware that:
   - assigns a request id when missing
   - sets `X-Request-Id` on responses
   - logs request start/finish and API errors with structured metadata.

Legacy server-rendered routes continue using existing render/error behavior and are not forced into the API envelope.

## Consequences

- API clients can depend on one error shape across endpoints.
- Operational debugging improves via request-id correlation across logs and responses.
- Migration risk is reduced because legacy render paths remain isolated from API response changes.
