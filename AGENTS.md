# Agent Instructions

This file is the repository-level instruction source for coding agents in this repository. It complements (and does not override) higher-priority platform/system instructions.

## Core Workflow

- Never commit secrets, credentials, or private keys.

## Production Deployment Safety

- Never deploy to production or a VPS unless the user explicitly instructs the agent to perform that production deployment in the current request.
- Do not treat requests to implement end-to-end, commit, push, build, verify, or restart a local process as authorization to change production.
- Production changes include pulling code on a server, installing dependencies, building on a server, restarting or creating PM2/services/containers, changing listeners, and editing or reloading Nginx/proxy/DNS routing.
- A deployment runbook, an existing production checkout, or a prior deployment does not imply authorization for another deployment.
- Read-only production inspection is allowed when needed to answer a status or topology question, but ask for explicit confirmation before making any production change.
- Distinguish local runtime restarts from remote production restarts in both execution and reporting.

## Planning and Delivery

- Any formal plan/proposal must include a concrete checklist of implementation steps.
- When asked to create a plan doc, save it under `docs/plans/`.
- Before committing, perform minimum relevant validation/build checks to ensure nothing is broken.
- When working on large work, after finishing a major chunk, automatically commit it, then update the plan before starting the next major chunk.
- If the user asks to implement a plan end-to-end (for example: "implement until completed", "fully implement", "implement the complete plan"), the agent must complete the full implementation in one run and not stop by phase.
- The only valid reasons to pause before full completion are blocking errors or essential clarifications from the user that are required to proceed safely.
- For new docs plan files under `docs/`, do not use `IMPLEMENTATION` in the filename. Use concise names with `PLAN`, `CHECKLIST`, or `CHECKLIST_PLAN` when applicable.
- Move a plan to `docs/plans/completed/` only after a formal verification stage (separate pass) succeeds and the plan has no pending or deferred items.
- A plan that is fully checked but still contains deferred items must remain outside `docs/plans/completed/`.

## Canonical Cards

- `Canonical card` means a concise quick-reference document for core/critical system behavior and features.
- Canonical cards live in `docs/canonical/`. If the folder does not exist yet, create it when adding the first canonical card; do not duplicate existing docs only to satisfy the location rule.
- Canonical cards are intentionally brief summaries used to quickly confirm expected behavior, feature support, and system flow.
- Canonical cards are the source of truth for intended behavior, feature support, and system flow in this repository.
- Canonical cards may be created or updated before implementation when planning new concepts, behaviors, or key features, but only when the user explicitly asks for or approves canonical-card changes.
- Implementation should follow approved canonical cards, not the other way around.
- If implementation conflicts with a canonical card, treat the canonical card as authoritative, surface the mismatch to the user, and do not silently reinterpret the card based on current code.
- Agents must not create, edit, sync, or refresh canonical cards unless the user explicitly asks for or approves that canonical-card work.
- Do not put deep implementation detail in canonical cards. Detailed technical specs, design docs, and implementation notes should be outside `docs/canonical/`.
- If behavior or feature support changes in implementation without prior canonical-card approval, flag the divergence and wait for user direction instead of auto-updating the canonical card.

## Source File Size Rule

- Keep source files at or below 1000 lines whenever practical.
- Exception: a file may exceed 1000 lines only when it is fully justified, required, and more sensible than splitting into smaller files.
- When adding substantial logic, prefer extracting modules/components to stay within the limit.
