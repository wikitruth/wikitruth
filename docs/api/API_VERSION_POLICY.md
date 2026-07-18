# API Version and Error Policy

Date: 2026-07-18

## Stable Contract

`/api/v1/*` is the stable API for integrations and software agents. `/api/*`
remains a compatibility alias for the modern browser client and existing
consumers. New integrations should not depend on the unversioned alias.

Every API response includes:

- `API-Version: 1` and `X-API-Version: 1`;
- `X-API-Stability: stable` for `/api/v1`, or `compatibility` otherwise;
- `Vary: Accept-Version`.

Clients may send `Accept-Version: 1`. Unsupported values fail with HTTP `406`
instead of silently falling forward.

## Error Contract

API errors use one machine-readable shape:

```json
{
  "success": false,
  "error": {
    "code": "UNSUPPORTED_API_VERSION",
    "message": "API version 2 is not supported",
    "details": { "requestedVersion": "2", "supportedVersions": ["1"] },
    "requestId": "request-correlation-id"
  }
}
```

Agents should branch on `error.code`, log `requestId`, honor `429` rate-limit
headers, and treat `401`, `403`, and `406` as fail-closed authorization or
contract errors. Human-readable messages are not stable identifiers.

## Compatibility and Change Rules

- Backward-compatible fields and endpoints may be added within v1.
- Existing fields do not change meaning within v1.
- Breaking request, response, authorization, or semantic changes require v2.
- Deprecations receive response headers and documentation before removal.
- OpenAPI coverage is source-checked against every mounted controller route.
