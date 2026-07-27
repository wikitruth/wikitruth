# Canonical Card: Target State Core Platform

## Purpose

Define the high-priority governance and integrity contract for the core platform.

## Core Platform Targets

- Duplicate prevention and deterministic merge workflow for core entities.
- Full Change Request domain (`CR`) with partial accept/reject and diff preview.
- Revision history model with reviewer-approved rollback.
- Suggestion-only contribution mode for protected/restricted entries.
- Consensus verdict model with reviewer votes, thresholds, and provenance.
- Reader signal intake queue (for example incorrect verdict, re-evaluate, wrong category).
- Issue-first governance gates for unresolved critical issues.
- Tamper-evident hash-chained audit timeline for privileged actions (moderation/verdict/role changes). Public-key signing requires a separate approved threat model.
- Sensitivity-aware consensus policies with eligible reviewer expertise,
  conflict disclosure, affiliation independence, material dissent, and
  non-destructive revalidation.
- Claim-level evidence semantics, citation locators, source integrity status,
  and public evidence bundles.
- Replay-safe agent mutations, dry-run validation, attributable agent runs, and
  scoped activity delivery.

## Reliability and Operations Targets

- Production runtime stability across deployment environments.
- Restore capability in modern admin workflows plus tested restore runbook.
- Expanded security regression coverage for sanitizer/XSS and auth callback paths.

## Target State Status

- Overall: foundational baseline and the approved epistemic product completion
  wave are `implemented` and locally verified.
- Automatic unresolved-content expiry remains explicitly `deferred`; human resolution and audited administrator override remain canonical.
- Source baseline: `docs/plans/deferred/plan-2026-04-14/09_GAP_CHECKLIST_PLAN.md` and `docs/plans/deferred/plan-2026-04-14/06_VALIDATED_CHECKLIST_CORE_PLATFORM.md`.
