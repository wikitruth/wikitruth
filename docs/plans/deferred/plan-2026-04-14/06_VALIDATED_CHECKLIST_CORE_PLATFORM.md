# Validated Checklist: Core Platform (Code-Rechecked)

Date validated: 2026-04-18; CORE-019/CORE-025 revalidated 2026-07-12
Validation basis: current repository code (`server/src`, `client/src`) only.

Status legend:
- `implemented`
- `partial`
- `not_implemented`

## A. Domain Model and Taxonomy

| ID | Status | Evidence in code | Gap / Not implemented |
| --- | --- | --- | --- |
| CORE-001 | `partial` | `server/src/models/schema/core/{Topic,Argument,Question,Answer,Issue,Opinion,Artifact,Definition}.ts` | No first-class `Comment` model (comment flows map to `Opinion`), and dictionary `Definition` is not surfaced via modern API/UI. |
| CORE-002 | `not_implemented` | Create/update handlers in `server/src/controllers/api/{topics,arguments,questions}.ts` do not run duplicate checks. | No near-duplicate detection, merge workflow, or redirect path for merged entries. |
| CORE-003 | `partial` | Link entities exist: `TopicLink`, `ArgumentLink`, `ObjectLink`; relationship enums in `server/src/models/constants.ts`. | Link taxonomy is incomplete vs checklist (`Support/Against/Related/Source/Reference` as explicit link records with full validation). Current `LINK_TYPES` is mostly `child/parent/reference`. |
| CORE-004 | `partial` | Status constants and usage in `server/src/models/constants.ts`, moderation and APIs. | Not strictly enum-enforced at schema level everywhere; filtering/badging coverage is uneven across entity pages. |
| CORE-005 | `partial` | `Word`, `Meaning`, and join model `Definition` (`wordId`, `meaningId`) exist in `server/src/models/schema/core/`. | Reverse lookup and dictionary UX/API are not implemented in the modern stack. |
| CORE-006 | `partial` | Tag fields exist (`tags` arrays), constants include `TOPIC_TAGS` / `ARGUMENT_TAGS`. | Missing grouped taxonomy framework (`Category/Issue/Reliability/Reality/Property`) with role/type restrictions and governance rules. |
| CORE-007 | `partial` | `referenceDate` exists on `Topic` and `Argument` schemas. | No `fragile_fact_flag` / `outdated_flag` fields, no expiry/warning behavior for stale claims. |
| CORE-008 | `partial` | `Topic.outline` schema exists; outline tree/search/link APIs in `server/src/controllers/api/outline.ts`. | No weighted sections, no drag-reorder/curation UX for full outline composition workflow. |

## B. Roles, Permissions, and Identity

| ID | Status | Evidence in code | Gap / Not implemented |
| --- | --- | --- | --- |
| CORE-009 | `partial` | Active role model in `server/src/controllers/api/auth.ts` (`reader/contributor/screener/reviewer/admin`), gate checks in moderation/auth/middleware files. | Hierarchy is present but not fully codified as a single policy engine with comprehensive integration test coverage for all critical actions. |
| CORE-010 | `not_implemented` | No onboarding checklist gate found in auth/member role progression code. | Contributor/reviewer promotion does not require completion of role-specific onboarding tasks. |
| CORE-011 | `not_implemented` | Role mutation routes exist in admin APIs, but no immutable promotion/demotion audit trail. | No vote-based moderation checks for role changes; no immutable role-change ledger. |
| CORE-012 | `partial` | Private profile checks and privacy flags in member/profile controllers; backup separates public/private data in admin backup flow. | No explicit repository-level privacy policy enforcement layer for minimum public PII and strict sensitive-field backup policy verification. |

## C. Contribution and Change Lifecycle

| ID | Status | Evidence in code | Gap / Not implemented |
| --- | --- | --- | --- |
| CORE-013 | `partial` | Screening + verdict states exist (`constants`, moderation endpoints, schema fields). | Full transition engine (`Pending -> Screened -> Reviewed/Verified`) with resubmit/reject workflows and complete auditability is incomplete. |
| CORE-014 | `not_implemented` | No CR entities/routes found for fragment-level proposals. | No change request workflow, partial accept/reject, or diff preview. |
| CORE-015 | `not_implemented` | No stale-CR conflict handling logic found. | No stale detection, rebase prompts, or merge dispute path. |
| CORE-016 | `partial` | Conversion workflow now preserves source/destination conversion metadata and history (`server/src/controllers/api/moderation.ts` `/convert-type`). | Full reversible revision graph with reviewer-approved rollback diff tooling is still not complete. |
| CORE-017 | `not_implemented` | Edit APIs enforce owner/admin edit, not suggestion-based edits. | No restricted-entry suggestion queue, no suggestion acceptance pipeline. |
| CORE-018 | `partial` | `Topic.sharing.users` exists in schema; moderation has take-ownership and ownership migration endpoints. | No full collaborator management UX/API (grant/revoke, audit by collaborator). |
| CORE-019 | `implemented` | `AnonymousContribution` schema/service/API plus `/contribute` and `/admin/anonymous-contributions` implement screened proposal intake, privacy-preserving rate/risk checks, receipt lookup, moderation, and authenticated adoption. | No direct anonymous publication is allowed; production enablement remains an explicit operating decision. |

## D. Review, Verdict, and Issue Engine

| ID | Status | Evidence in code | Gap / Not implemented |
| --- | --- | --- | --- |
| CORE-020 | `partial` | Typed issue categories + criticality in `ISSUE_TYPES`, issue create/update APIs, issue forms. | Severity does not reliably enforce blocking interactions/debate gates end-to-end. |
| CORE-021 | `implemented` | Reviewer-vote governance + provenance is available via moderation vote APIs and modern admin moderation pages. | No critical parity gap in reviewer vote governance remains in closure scope. |
| CORE-022 | `partial` | `ARGUMENT_TYPES` includes ethical/factual/prediction and `ethicalStatus` exists on schemas. | No distinct truth-vs-ethics verdict channels with dedicated UI and policy enforcement. |
| CORE-023 | `implemented` | Reader signal model + triage queue implemented in moderation APIs and admin signal dashboard (`client/src/pages/Admin/ModerationSignals/SignalsAppealsPage.tsx`). | No critical reader-signal parity blocker remains in closure scope. |
| CORE-024 | `implemented` | Appeal queue with review workflow and notification hooks is implemented in moderation services/UI. | No critical appeal-workflow parity blocker remains in closure scope. |
| CORE-025 | `partial` | Archived screening status exists (`SCREENING_STATUS.status3`) and archived query support in flow utils. | Automatic unresolved-content expiry is explicitly deferred by product decision (2026-07-12); unresolved records remain visible for human resolution. |
| CORE-026 | `not_implemented` | No rule enforcement found that blocks debate progression when major issues are unresolved. | Issue-first moderation gate is absent. |

## E. Artifact and Evidence Foundation

| ID | Status | Evidence in code | Gap / Not implemented |
| --- | --- | --- | --- |
| CORE-027 | `partial` | `Artifact` is first-class schema + APIs; supports `source` and inline file metadata. | No explicit subtype taxonomy (`Quote`, `Photo`, `Video`, `Dataset`, etc.) with dedicated moderation/display semantics. |
| CORE-028 | `partial` | Basic provenance field: `source` plus file metadata (`type`, `size`, `lastModifiedDate`). | Missing richer provenance set (`origin_type`, `capture_date`, `verifiability_notes`). |
| CORE-029 | `partial` | Internal file artifact support exists (legacy artifacts controller) and external-link mode exists (`source`). | Not unified in modern UX end-to-end; moderation/evidence presentation parity is incomplete across both modes. |

## F. Security and Ops Baseline

| ID | Status | Evidence in code | Gap / Not implemented |
| --- | --- | --- | --- |
| CORE-030 | `implemented` | Modern backup + restore flow is implemented (`server/src/controllers/api/admin.ts`, `client/src/pages/Admin/DBBackup/DBBackupPage.tsx`) with runbook + restore tests (`docs/runbooks/ADMIN_RESTORE_ROLLBACK_DRILL_2026-04-18.md`, `tests/server/admin-db-backup-restore.test.ts`). | No critical restore parity blocker remains in closure scope. |
| CORE-031 | `implemented` | Runtime compatibility and PM2 restart reliability are covered via CI matrix (`.github/workflows/ci.yml`) and runtime check script (`scripts/runtime/pm2-restart-check.sh`). | No critical restart/runtime compatibility blocker remains in closure scope. |
| CORE-032 | `implemented` | Sanitizer coverage expanded with middleware regression tests (`tests/server/sanitize-content-middleware.test.ts`) and utility tests (`tests/server/sanitize-html.test.ts`). | No critical XSS regression blocker remains in closure scope. |
| CORE-033 | `implemented` | OAuth/session callback coverage added via route registration + session flow tests (`tests/server/auth-social-session-callbacks.test.ts`). | No critical OAuth/session parity blocker remains in closure scope. |
| CORE-034 | `implemented` | Immutable privileged-action audit timeline and admin viewer implemented (`/api/admin/audit-events`, admin audit page). | No critical audit-timeline parity blocker remains in closure scope. |
| CORE-035 | `implemented` | Reusable meta component (`client/src/components/common/PageMeta.tsx`) is used on entry pages (`TopicEntryPage`, `ArgumentEntryPage`, etc.). | Remaining work is mostly validation/QA breadth, not core implementation availability. |

## Summary

- `implemented`: 10
- `partial`: 17
- `not_implemented`: 8

Primary remaining blockers outside closure scope in this historical snapshot: duplicate/merge, CR/revision, and onboarding rows require broader status reconciliation; automatic expiry remains intentionally deferred.
