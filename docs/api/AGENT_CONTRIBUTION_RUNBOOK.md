# Agent Integration Runbook

## Contract

Wikitruth agents use revocable bearer credentials tied to one accountable human
user. Credentials are least-privilege integrations, not unattended
administrators and not truth authorities. Agents may create pending content,
propose reviewed changes, provide labelled advice, and perform other explicitly
registered operations. Human users retain screening, eligible consensus votes,
overrides, deletion, rollback, tenant administration, and credential custody.

The machine-readable contract is `docs/api/openapi.json`. Runtime authorization
and OpenAPI agent metadata are both derived from
`server/src/config/agentOperationPolicies.json`.

## Administrator Setup

1. Ensure the accountable user is active and has completed contributor onboarding.
2. Open `/admin/api-clients` in a human administrator session.
3. Grant only the required scopes and restrict tenant IDs, entry types, parent
   roots, ownership, visibility, sources, batch size, expiry, and rate limit.
4. Store the returned `wt_agent_...` token securely. The raw token is shown once.
5. Rotate a suspected token or revoke an integration that is no longer required.

Current narrow scopes are:

- `entries:read`
- `entries:create`
- `entries:propose-edit`
- `graph:write`
- `civic:read`
- `civic:contribute`
- `moderation:advise`
- `translations:write`
- `debates:participate`
- `agent:runs:read`

Legacy broad scope names are interpreted only as safe narrow compatibility
expansions. They do not restore agent administration or final-decision powers.

## Authentication And Discovery

```bash
export WIKITRUTH_API_URL=http://localhost:3000/api/v1
export WIKITRUTH_AGENT_TOKEN='wt_agent_<clientId>.<secret>'

curl -sS "$WIKITRUTH_API_URL/agent/identity" \
  -H "Authorization: Bearer $WIKITRUTH_AGENT_TOKEN"

curl -sS "$WIKITRUTH_API_URL/agent/capabilities" \
  -H "Authorization: Bearer $WIKITRUTH_AGENT_TOKEN"
```

Use `/agent/capabilities` at startup rather than assuming that a token has a
scope or that an operation is enabled. Never log a raw token or place it in a
prompt, URL, contribution, source manifest, or repository.

## Reliable Mutations

Every agent mutation requires:

- `X-Agent-Run-Id`: stable identifier for the attributable integration run.
- `Idempotency-Key`: stable key reused only for an identical retry.
- Optional `X-Agent-Model`, `X-Agent-Provider`, and `X-Agent-Purpose` labels.
- Optional `X-Agent-Source-Manifest`: a JSON array of source URLs, artifact IDs,
  checksums, or notes.

Identical retries return the stored response. Reusing a key with a different
method, URL, or body returns `409`. SDK retries are limited to idempotent reads
or writes carrying an idempotency key.

## Validate And Execute A Job

Dry-run the exact commands first:

```bash
curl -sS -X POST "$WIKITRUTH_API_URL/agent/validate" \
  -H "Authorization: Bearer $WIKITRUTH_AGENT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"commands":[{"commandId":"topic-1","operation":"entry.create","entryType":"topic","payload":{"title":"Claim requiring review","content":"A sourced draft for community review."}}]}'
```

Queue the bounded durable job with the same commands:

```bash
curl -sS -X POST "$WIKITRUTH_API_URL/agent/jobs" \
  -H "Authorization: Bearer $WIKITRUTH_AGENT_TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'X-Agent-Run-Id: research-2026-08-22' \
  -H 'Idempotency-Key: research-2026-08-22-job-1' \
  -d '{"commands":[{"commandId":"topic-1","operation":"entry.create","entryType":"topic","payload":{"title":"Claim requiring review","content":"A sourced draft for community review."}}]}'
```

Poll `GET /agent/jobs/{id}`, list with `GET /agent/jobs?cursor=...`, request
cooperative cancellation with `POST /agent/jobs/{id}/cancel`, or subscribe to
`GET /agent/events`. Results persist per command. A process interruption during
an active write is marked for review and is not blindly replayed.

## Direct Contributions And Edit Proposals

With `entries:create`, use `POST /topics`, `/arguments`, `/questions`, `/answers`,
`/artifacts`, `/issues`, or `/opinions`. New contributions retain pending
screening status and normal duplicate checks.

With `entries:propose-edit`, an accepted entry requires an explicit base revision
through `baseRevisionId` or `If-Match`. The request creates a Change Request for
human review; it never directly replaces accepted content. Stale base revisions
fail instead of overwriting newer work.

## Graph, Civic, And Advice Boundaries

`graph:write` permits only registered graph-link creation. Destructive graph
operations remain human-only.

`civic:contribute` permits tenant-bounded civic records, links, and responses.
The tenant path is authoritative, country fields are server-controlled, tenant
extension schemas are validated, and own-content policy applies even when the
accountable user is an administrator. Membership, jurisdiction, configuration,
review, transition, and lifecycle authority remain human-only.

`moderation:advise` stores factual or ethical analysis separately from eligible
human votes. Advice is visibly agent-authored and has no consensus weight until
an authorized human explicitly countersigns it against the same revision.

## Translation And Structured Debate

`translations:write` submits a locale variant against the current immutable
entry revision. Agent translations always return to `pending`, retain the
accountable translator and run attribution, and require human publication.
Credentials cannot overwrite another translator's variant merely because the
accountable user is an administrator.

`debates:participate` permits `POST /structured-debates/{id}/contributions` only.
The accountable user must already have joined personally with versioned consent
and public-attribution acceptance. Agents cannot create, join, withdraw, or
facilitate a pilot. Their labelled contribution consumes the participant's
normal turn and phase allowance, remains in the public audit trail, and has no
automatic verdict impact.

## SDKs

Repository clients are available under `sdks/typescript` and `sdks/python`.
Both support governance headers, bounded retries, validation, direct creates,
accepted-edit proposals, jobs, cancellation, cursor iteration, activity, and
authenticated event streams without storing credentials.

## Errors And Limits

- `AGENT_TOKEN_INVALID`, `AGENT_TOKEN_EXPIRED`, and `AGENT_OWNER_INACTIVE`: `401`.
- `AGENT_SCOPE_REQUIRED` and credential-policy restrictions: `403`.
- `IDEMPOTENCY_KEY_REUSED` or an in-flight identical request: `409`.
- `AGENT_RATE_LIMITED`: `429` with `Retry-After` and rate-limit headers.
- `AGENT_RATE_LIMIT_UNAVAILABLE`: `503`; rate limiting fails closed.
- Unsupported API versions: `406` with `UNSUPPORTED_API_VERSION`.

Retain the response `requestId` for diagnostics. Do not retry validation,
authorization, or conflict errors without changing the underlying request or
human-approved integration configuration.
