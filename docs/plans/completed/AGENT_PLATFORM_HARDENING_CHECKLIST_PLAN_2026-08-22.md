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
- [x] Use the registry for enforcement, capabilities, OpenAPI metadata, and
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
- [x] Require `graph:write` for every graph-link mutation and keep destructive
      graph operations human-only.
- [x] Restrict civic agent mutations to content contribution paths, never tenant
      membership, jurisdiction, configuration, or lifecycle authority.

## 4. Validation And Jobs

- [x] Share validators between dry-run and mutation command handlers.
- [x] Fix civic validation to use the canonical `kind` field and tenant schema.
- [x] Add bounded validate/execute agent jobs with per-item results,
      idempotency, cancellation, polling, and progress events.
- [x] Add cursor pagination for agent activity and job collections.
- [x] Keep jobs resumable and avoid one large cross-command transaction.

## 5. Efficiency And Operations

- [x] Replace process-local rate windows with durable atomic rate buckets.
- [x] Batch last-used/request accounting rather than writing on every request.
- [x] Preserve revocation correctness while using a short-lived credential cache.
- [x] Add usage, denial, replay, job, and advisory-review observability.

## 6. Integration Experience

- [x] Publish complete OpenAPI security, scope, policy, concurrency, and job
      contracts for every supported agent operation.
- [x] Generate TypeScript and Python SDKs with retries, headers, cursor helpers,
      dry runs, jobs, and event support.
- [x] Correct the agent runbook and provide end-to-end examples.
- [x] Enable pending translation suggestions by agents.
- [x] Enable clearly labelled structured-debate contributions by agents only for
      an accountable participant and never as automatic verdict input.

## 7. Verification And Closure

- [x] Add operation-by-operation authorization matrix coverage.
- [x] Add all-seven create and accepted-edit proposal tests.
- [x] Add advisory-vote, countersign, civic boundary, graph boundary,
      translation, debate, job, rate-limit, and SDK contract tests.
- [x] Run focused server and client suites after each implementation group.
- [x] Run full server/client tests, lint, type checks, source guardrails,
      OpenAPI checks, and production builds.
- [x] Run browser acceptance for credential policy management at desktop and
      390 px mobile widths.
- [x] Perform a separate closure pass, reconcile this checklist, and move it to
      `docs/plans/completed/` only when no item remains pending or deferred.

## Verification Evidence

- Full server suite: 127 suites and 516 tests passed.
- Full client suite: 132 suites and 412 tests passed. Two integration tests that
  timed out during the concurrent validation sweep passed alone and in the
  subsequent unloaded full run.
- ESLint completed with zero errors and six pre-existing test warnings; modern
  and legacy TypeScript checks passed.
- Type-suppression, `any`, CommonJS, file-size, server-path, mixed-import, and
  legacy-isolation guardrails passed.
- OpenAPI coverage passed for 322 mounted operations; the TypeScript SDK built
  and both Python SDK tests passed.
- Production server and client builds passed.
- Disposable Chrome acceptance passed at 1280 x 800 and 390 x 844 for admin
  login, local passkey assurance, credential creation, bearer authentication,
  usage review, rotation, old-secret invalidation, mobile layout, revocation,
  and current-secret invalidation.
- Browser evidence is under
  `docs/qa/artifacts/agent-browser-disposable-2026-08-22/`. It reports no console
  errors, no retained raw token, and zero mutable fixture residue. The only
  warnings are expected script-fetch certificate warnings from local HTTPS.

## Status

`completed` - formally verified on 2026-08-22 with no pending or deferred plan
items. Implementation and acceptance remained local/develop only; no production
or VPS deployment was performed or authorized.
