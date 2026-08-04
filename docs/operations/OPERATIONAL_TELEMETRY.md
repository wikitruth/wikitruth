# Operational Telemetry

Wikitruth keeps a bounded first-party operational history for administrators.
The application records a health snapshot every five minutes and accepts
same-origin client-error and CSP reports through the existing monitoring API.
API failures are recorded through the central API error handler.

## Data boundaries

Operational events contain only an event kind, severity, source, bounded code,
redacted message, fingerprint, normalized path, request ID, and timestamp. They
must never contain request or response bodies, authorization headers, cookies,
IP addresses, user-agent strings, raw stack traces, email addresses, tokens,
credentials, export content, or local filesystem paths.

MongoDB TTL indexes remove events after 30 days, health snapshots after 90
days, and alert history after 180 days. Status snapshots retain component
status and a sanitized summary, not raw component details.

## Alert behavior

Built-in rules cover database availability, storage pressure, overall health,
and repeated server/client errors. Alerts are deduplicated per rule and use a
configurable cooldown before notifying active administrators again. Rule
changes, acknowledgements, and resolutions require privileged passkey
assurance and are added to the privileged audit chain.

The System operations page exposes Health, Events & alerts, and Backups as
separate workspaces. An endpoint or process being healthy is operational
evidence only; it is not proof of a successful user flow, deployment, backup,
or off-host recovery copy.
