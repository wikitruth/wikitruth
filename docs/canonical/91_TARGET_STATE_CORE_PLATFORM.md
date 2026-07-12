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

## Reliability and Operations Targets

- Production runtime stability across deployment environments.
- Restore capability in modern admin workflows plus tested restore runbook.
- Expanded security regression coverage for sanitizer/XSS and auth callback paths.

## Target State Status

- Overall: scoped core-platform baseline `implemented`.
- Automatic unresolved-content expiry remains explicitly `deferred`; human resolution and audited administrator override remain canonical.
- Source baseline: `docs/plans/deferred/plan-2026-04-14/09_GAP_CHECKLIST_PLAN.md` and `docs/plans/deferred/plan-2026-04-14/06_VALIDATED_CHECKLIST_CORE_PLATFORM.md`.
