# Agent Platform Hardening Checklist Plan (2026-08-22)

## Objective

Turn the existing scoped contribution API into a complete, efficient, and
least-privilege agent integration surface without creating an unattended
administrator or truth authority.

## Safety Boundaries

- [x] Agent credentials never satisfy human passkey assurance.
- [x] Eligible verdicts, screening, overrides, deletion, merge, rollback,
      credential management, roles, tenant administration, privacy execution,
      backup, and restore remain human-only.
- [x] Accepted content is changed by agents only through stale-safe Change
      Requests that a human reviewer resolves.
- [x] Agent review input is visibly advisory and cannot count toward or publish
      consensus until a human reviewer countersigns it.
- [x] Existing credentials remain revocable and attributable while legacy scope
      names receive a safe compatibility interpretation.
- [x] No production or VPS deployment is included in this plan.

## 1. Canonical Contract

- [x] Define operation-level agent authorization and machine-readable discovery.
- [x] Define credential boundaries for tenants, entry types, parent roots,
      ownership, visibility, and source requirements.
- [x] Define agent edit proposals, advisory review, jobs, SDKs, translations,
      and structured-debate participation.
- [x] Reconcile the affected canonical cards before implementation.

## 2. Authorization And Credentials

- [x] Replace broad path-prefix scope inference with a shared operation-policy
      registry.
- [ ] Use the registry for enforcement, capabilities, OpenAPI metadata, and
      authorization matrix tests.
- [x] Split read, create, edit-proposal, graph, civic, moderation-advice,
      translation, debate, and run-observation scopes.
- [x] Reject agent access to unregistered operations, including reactions and
      all human-only administration paths.
- [x] Add bounded credential policies and an administrator UI for issuing them.
- [x] Remove unattended `admin:write` behavior rather than relying on runtime
      passkey configuration to contain it.

## 3. Content And Governance

- [x] Route agent edits of accepted entries through Change Requests.
- [x] Require an explicit base revision for protected accepted-content edits.
- [x] Keep pending or agent-owned draft edits attributable and policy-bounded.
- [x] Store agent verdict analysis separately from eligible human votes.
- [x] Add human countersign/reject operations with stale-state protection.
- [x] Ensure agents cannot overwrite a human review vote or trigger consensus.
- [ ] Require `graph:write` for every graph-link mutation and keep destructive
      graph operations human-only.
- [ ] Restrict civic agent mutations to content contribution paths, never tenant
      membership, jurisdiction, configuration, or lifecycle authority.

## 4. Validation And Jobs

- [x] Share validators between dry-run and mutation command handlers.
- [x] Fix civic validation to use the canonical `kind` field and tenant schema.
- [x] Add bounded validate/execute agent jobs with per-item results,
      idempotency, cancellation, polling, and progress events.
- [x] Add cursor pagination for agent activity and job collections.
- [x] Keep jobs resumable and avoid one large cross-command transaction.

## 5. Efficiency And Operations

- [ ] Replace process-local rate windows with durable atomic rate buckets.
- [ ] Batch last-used/request accounting rather than writing on every request.
- [ ] Preserve revocation correctness while using a short-lived credential cache.
- [ ] Add usage, denial, replay, job, and advisory-review observability.

## 6. Integration Experience

- [ ] Publish complete OpenAPI security, scope, policy, concurrency, and job
      contracts for every supported agent operation.
- [ ] Generate TypeScript and Python SDKs with retries, headers, cursor helpers,
      dry runs, jobs, and event support.
- [ ] Correct the agent runbook and provide end-to-end examples.
- [ ] Enable pending translation suggestions by agents.
- [ ] Enable clearly labelled structured-debate contributions by agents only for
      an accountable participant and never as automatic verdict input.

## 7. Verification And Closure

- [x] Add operation-by-operation authorization matrix coverage.
- [x] Add all-seven create and accepted-edit proposal tests.
- [ ] Add advisory-vote, countersign, civic boundary, graph boundary,
      translation, debate, job, rate-limit, and SDK contract tests.
- [ ] Run focused server and client suites after each implementation group.
- [ ] Run full server/client tests, lint, type checks, source guardrails,
      OpenAPI checks, and production builds.
- [ ] Run browser acceptance for credential policy management at desktop and
      390 px mobile widths.
- [ ] Perform a separate closure pass, reconcile this checklist, and move it to
      `docs/plans/completed/` only when no item remains pending or deferred.

## Status

`in_progress` - approved by the repository owner on 2026-08-22; implementation
is local/develop work only and is not authorized for production deployment.
