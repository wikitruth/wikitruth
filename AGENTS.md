# Agent Instructions

This file is the repository-level instruction source for coding agents in this repository. It complements (and does not override) higher-priority platform/system instructions.

## Core Workflow

- Never commit secrets, credentials, or private keys.

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
- Canonical cards live in `docs/canonical/`.
- Canonical cards are intentionally brief summaries used to quickly confirm expected behavior, feature support, and system flow.
- Canonical cards may be created or updated before implementation when planning new concepts, behaviors, or key features.
- By default, implementation should follow what is specified in canonical cards (canonical card first), not the other way around.
- Only treat implementation as the source of truth over canonical cards when the user explicitly asks to sync/update canonical cards to reflect existing implementation.
- Do not put deep implementation detail in canonical cards. Detailed technical specs, design docs, and implementation notes should be outside `docs/canonical/`.
- When behavior or feature support changes, update the related canonical card in the same work so the quick-reference stays accurate.
