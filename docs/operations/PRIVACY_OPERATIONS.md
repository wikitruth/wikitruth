# Privacy Operations

## Purpose

Wikitruth supports governed account-data exports and account anonymization. The
self-service page is `/account/privacy`; the permission-protected operator queue
is `/admin/privacy-requests`.

This implementation is local code only until an explicitly authorized release.
It does not authorize an operator to execute a privacy action against production
data.

## Request lifecycle

1. An authenticated account submits an export or anonymization request.
2. A security administrator records review evidence and can apply a legal hold.
3. A request must be reviewed and approved before execution.
4. An export becomes available for 30 days. The account must request a separate
   ten-minute authorization and the resulting download can be consumed once.
5. Anonymization requires a fresh ten-minute impact preview with no blockers and
   an exact `ANONYMIZE <username>` confirmation.
6. Every lifecycle transition is added to the request timeline and privileged
   audit chain. A failed anonymization can return to review for an investigated,
   idempotent retry.

Users can cancel only submitted or in-review requests. Final, executing, ready,
or legally blocked requests require operator handling.

## Export boundary

- The export is assembled only after the authenticated one-time download call;
  no export file is written to local or off-host storage.
- The response is private, non-cacheable JSON with download-safe headers.
- Passwords, reset credentials, token and secret hashes, cryptographic keys,
  encrypted delivery payloads, raw stacks, mobile credentials, and server-side
  file paths are recursively excluded.
- Linked social-provider credential objects are excluded from the account
  projection rather than filtered after retrieval.
- The authorization is stored only as a SHA-256 hash. The raw token exists only
  in the authenticated browser response and request body and is never included
  in notifications or audit payloads.

## Anonymization boundary

The operation uses a stable `anonymous-<account-id-suffix>` pseudonym and keeps
the account object ID so public contributions, revision lineage, citations, and
graph relationships remain intact. It then:

- replaces username and email with non-routable pseudonymous values;
- disables the account and password login and removes the password hash;
- removes social identities, mobile tokens, preferences, and role links;
- revokes active sessions, passkeys, and API clients;
- removes recovery/auth ceremonies, trusted clients, login attempts,
  subscriptions, reactions, private notification/activity records, tenant and
  group memberships, and reputation snapshots.

Root and linked administrator identities cannot be anonymized. An active legal
hold blocks preview approval and execution. The steps are deterministic and
idempotent so a recorded failure can be investigated and retried safely.

Tamper-evident privileged audit records and immutable revision history are not
rewritten because doing so would invalidate their integrity evidence. Those
records remain access-controlled and are retained for accountability; current
public attribution resolves through the pseudonymized account ID.

## Operator checklist

- Confirm the request subject and stated scope.
- Record review evidence; apply a legal hold when required.
- For anonymization, unlink any administrator identity before approval.
- Generate the impact preview immediately before execution and inspect every
  blocker and count.
- Require exact confirmation from the operator; never copy a preview token into
  tickets, logs, or chat.
- After execution, verify the audit event, revoked authentication, pseudonymous
  public attribution, and the request final state.
- Treat a `failed` state as an incident: inspect the sanitized failure code,
  return the request to review with a note, generate a new preview, and retry
  only after the cause is understood.
