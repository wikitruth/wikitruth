# Canonical Card: Target State Core Platform

## Purpose

Define high-priority core platform capabilities planned beyond current implementation.

## Core Platform Targets

- Duplicate prevention and deterministic merge workflow for core entities.
- Full Change Request domain (`CR`) with partial accept/reject and diff preview.
- Revision history model with reviewer-approved rollback.
- Suggestion-only contribution mode for protected/restricted entries.
- Consensus verdict model with reviewer votes, thresholds, and provenance.
- Reader signal intake queue (for example incorrect verdict, re-evaluate, wrong category).
- Issue-first governance gates for unresolved critical issues.
- Immutable signed audit timeline for privileged actions (moderation/verdict/role changes).

## Reliability and Operations Targets

- Production runtime stability across deployment environments.
- Restore capability in modern admin workflows plus tested restore runbook.
- Expanded security regression coverage for sanitizer/XSS and auth callback paths.

## Target State Status

- Overall: `planned`, with several foundations currently `partial`.
- Source baseline: `docs/plans/plan-2026-04-14/09_GAP_CHECKLIST_PLAN.md` and `06_VALIDATED_CHECKLIST_CORE_PLATFORM.md`.
