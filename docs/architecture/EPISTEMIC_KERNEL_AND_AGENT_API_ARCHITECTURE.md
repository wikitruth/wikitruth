# Epistemic Kernel and Agent API Architecture

Date: 2026-07-18

## Decision Summary

Wikitruth uses reviewer consensus as its normal truth-governance mechanism. A
selected platform administrator may make the final decision, but only through a
separate, visible override operation that records why consensus was overridden,
what evidence was considered, and who is accountable for the decision.

Software agents may contribute through scoped API-client identities. An agent is
never an anonymous authority: every credential belongs to an accountable user,
has explicit permissions, can be revoked, and leaves client attribution in the
revision and audit trail. Agent-authored entries use the same duplicate checks,
onboarding gates, pending screening status, evidence requirements, and moderation
workflow as human-authored entries.

## Verdict Decision Model

### Independent Channels

`factual` and `ethical` votes are independent records. A reviewer can vote in
either or both channels. Each vote contains:

- channel and channel-specific status;
- rationale and evidence references;
- confidence from 0 to 100;
- declared expertise relevant to the decision;
- a conflict-of-interest declaration;
- policy version and timestamps.

Conflicted votes remain auditable but do not count toward consensus. Abstentions
count toward participation reporting but not toward a status majority.

### Consensus

The default policy is versioned and configurable:

- minimum eligible votes: 3;
- supermajority: two thirds of eligible non-abstaining votes;
- minimum leading votes: 2;
- minimum average confidence for the leading result: 60;
- every non-pending final status requires substantive reasoning;
- ethical decisions additionally require an identified framework;
- final factual decisions remain subject to the issue-first gate.

The summary records eligible, excluded, abstaining, and status counts. Consensus
does not erase minority reasoning.

### Administrator Final Say

An administrator can publish, replace, or clear a final channel decision even
when consensus is absent or disagrees. The operation requires:

- a target channel and status;
- a substantive override reason;
- decision reasoning and evidence references;
- an ethical framework when applicable;
- acknowledgement that this is an administrator override.

The persisted channel stores `decisionMode=admin_override`, the administrator,
override reason, policy version, decision date, and the consensus snapshot that
was available at decision time. The UI labels the result as an administrator
decision. A later consensus or administrator decision creates another revision;
history is never rewritten.

## Agent Identity and Authorization

### Credential Form

An API credential is emitted once as:

`wt_agent_<clientId>.<random secret>`

Only a SHA-256 digest of the secret is stored. Credentials include a short public
prefix for identification, owner user, name, scopes, status, optional expiry,
per-minute request limit, last-use metadata, and rotation/revocation timestamps.

### Scopes

- `entries:read`: read public and owner-visible knowledge APIs.
- `contributions:write`: create/update through standard entry APIs.
- `graph:write`: create governed outline relationships.
- `civic:write`: create/update civic records for an authorized tenant member.
- `moderation:write`: reviewer operations when the owner user has that role.
- `admin:write`: disabled by default and never implied by owning an admin user.

Both the credential scope and the owner user's role/onboarding state must allow
the operation. A token can reduce authority; it cannot grant authority that its
owner does not have.

### Request Pipeline

API-client authentication runs after session/passport identity restoration and
before CSRF evaluation. Valid bearer requests are CSRF-exempt because they do not
use ambient cookie authority. Invalid bearer tokens do not bypass CSRF. API
scope enforcement runs before individual API controllers.

Every agent mutation records API client ID and name in request attribution,
entry revisions, and audit events. Secrets and raw bearer values are never
logged or returned after issuance.

## Governed Graph Mutations

Graph links are content mutations. They require contributor onboarding plus a
`graph:write` scope for API clients. The service validates parent and target
visibility, relationship compatibility, self/cycle constraints, and duplicates.
Successful changes create a graph revision, privileged event, and notification.

## Reputation and Ranking

Reputation measures durable contribution quality rather than raw activity.
Votes or decisions receive quality credit only after the durability window and
lose credit when overturned. Administrative access itself creates no score.
Trusted ranking uses evidence completeness, source quality, verdict confidence,
screening, and unresolved issues before a bounded author-reputation contribution.

## Civic Extension Validation

Common civic fields remain typed. Tenant extensions use a bounded declarative
schema supporting string, number, boolean, date, and enum fields with required,
length, range, and option constraints. Civic records store validated extension
values in a dedicated `extensions` object. Arbitrary executable schemas and
country-specific backend forks are prohibited.

## Public and Operational Requirements

- Initial HTML contains route-specific metadata for entry and civic detail URLs.
- Sitemaps use the active host and canonical root paths.
- Keyboard focus is visibly distinguishable.
- OpenAPI describes every supported agent and public integration route.
- Realtime delivery supports a durable adapter for multi-process deployments.
- A disposable flagship pilot proves the complete governance workflow without
  pretending that real-world reviewer adoption has occurred.

