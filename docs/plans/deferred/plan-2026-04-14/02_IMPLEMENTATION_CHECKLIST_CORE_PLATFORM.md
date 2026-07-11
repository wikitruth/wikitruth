# Core Platform Implementation Checklist

Scope: domain model, contribution lifecycle, review/verdict mechanics, artifact model, security, and operational baseline.

## A. Domain Model and Taxonomy

- [ ] `CORE-001` Implement unified `Entry` type system with first-class types: `Topic`, `Argument`, `Question`, `Answer`, `Issue`, `Comment`, `Artifact`, `Definition`.
  - Done when: each type is persisted, queryable, and renderable with type-specific UI affordances.
  - Sources: `Mechanics & Architecture`, `Wikitruth Tasks`, `Wikitruth Notes`, `Design/*.smmx`, `Entity Hierarchy.gliffy`.

- [ ] `CORE-002` Implement strict duplicate prevention and duplicate merge workflow for `Topic`, `Argument`, and `Question`.
  - Done when: create/edit paths run duplicate checks and support merge/redirect of near-duplicates.
  - Sources: `Content Duplicates`, `Backlog`, `Research Features`.

- [ ] `CORE-003` Implement parent/child and link relationship model with explicit link types (`Child`, `Support`, `Against`, `Related`, `Source`, `Reference`).
  - Done when: links have their own records, validation rules, and relation-specific UI labels.
  - Sources: `Wikitruth Tasks`, `Backlog`, `Research Features`.

- [ ] `CORE-004` Implement topic/argument status taxonomies and enforce enum-driven statuses.
  - Done when: statuses are constrained in schema and exposed in filtering, sorting, and badges.
  - Sources: `Acceptance & Verdict`, `Backlog`, `Mechanics & Architecture`, `Wikitruth Notes`.

- [ ] `CORE-005` Implement dictionary many-to-many model (`Word -> Meanings`, `Meaning -> Words`).
  - Done when: dictionary entries support aliasing, multiple senses, and reverse lookup.
  - Sources: `Development Phases`, `Wikitruth Tasks`, `Dictionary.smmx`.

- [ ] `CORE-006` Implement tag framework with taxonomy groups (`Category`, `Issue`, `Reliability`, `Reality`, `Property`).
  - Done when: tags can be restricted by role and type-scoped at entry/action level.
  - Sources: `Issues`, `Development Phases`, `Wikitruth Tasks`.

- [ ] `CORE-007` Implement entry reference date and fragility metadata (`as_of_date`, `fragile_fact_flag`, `outdated_flag`).
  - Done when: fragile facts can expire or show warnings without deleting historical content.
  - Sources: `Backlog`, `Research Features`, `Development Phases`.

- [ ] `CORE-008` Implement outline model for topic composition (`primary claims`, `subtopics`, `FAQ`, ordered blocks).
  - Done when: outline supports ordered sections, drag reordering, and weighted sections.
  - Sources: `Wikitruth Notes`, `Backlog`, `Research Features`, `Topics to create`.

## B. Roles, Permissions, and Identity

- [ ] `CORE-009` Implement role hierarchy: `Anonymous`, `Reader`, `Contributor`, `Screener`, `Reviewer`, `Admin`.
  - Done when: role gates are enforced on actions and can be tested by integration tests.
  - Sources: `Users`, `Scenarios & Use Cases`, `Wikitruth Tasks`.

- [ ] `CORE-010` Implement onboarding requirements for Contributor/Reviewer progression.
  - Done when: contributor/reviewer activation requires completion of role-specific checklist.
  - Sources: `Users`, `Note to self`, `Wikitruth Notes`.

- [ ] `CORE-011` Implement reviewer promotion/demotion audit trail and vote-based moderation checks.
  - Done when: all role promotions and demotions are immutable and reviewable.
  - Sources: `Mechanics & Architecture`.

- [ ] `CORE-012` Implement privacy and identity protection controls (minimum public PII, strict backup policy for sensitive fields).
  - Done when: PII exposure is minimized and backup process follows policy constraints.
  - Sources: `Wikitruth Tasks` Security section.

## C. Contribution and Change Lifecycle

- [ ] `CORE-013` Implement lifecycle states: `Pending Screening -> Screened -> Reviewed/Verified` with rejection/resubmit paths.
  - Done when: state transitions are rule-driven and fully auditable.
  - Sources: `Development Phases`, `Wikitruth Tasks`, `Backlog`.

- [ ] `CORE-014` Implement `Change Request (CR)` workflow with partial accept/reject and diff preview.
  - Done when: CR supports add/delete/amend on content fragments and reviewer actions.
  - Sources: `Change Request (CR)`, `Versioning & History`.

- [ ] `CORE-015` Implement conflict handling for stale CRs and manual merge dispute flow.
  - Done when: stale CR detection, rebase prompts, and merge-issue flags are supported.
  - Sources: `Change Request (CR)`.

- [ ] `CORE-016` Implement version history with reversible revisions and reviewer-approved rollback.
  - Done when: entry and block-level revisions can be traversed and rolled back by policy.
  - Sources: `Versioning & History`, `Change Request (CR)`, `Development Phases`.

- [ ] `CORE-017` Implement edit suggestions for restricted entries and author/editor assignment controls.
  - Done when: restricted entries accept suggestions without direct overwrite.
  - Sources: `Backlog`, `Mechanics & Architecture`.

- [ ] `CORE-018` Implement ownership and collaborator model for co-maintained topics.
  - Done when: owners can grant/revoke write collaboration and audit changes by collaborator.
  - Sources: `Wikitruth Tasks`.

- [x] `CORE-019` Implement controlled anonymous contribution with rate limits and anti-abuse checks.
  - Done when: anonymous/IP contributors are constrained by quotas and risk rules.
  - Implemented: proposal-only public intake, HMAC network identity, hourly/daily quotas, honeypot and form-age checks, duplicate fingerprints, reviewer queue, receipt status, and authenticated adoption (`ee859b32`).
  - Sources: `Backlog`, `Mechanics & Architecture`.

## D. Review, Verdict, and Issue Engine

- [ ] `CORE-020` Implement issue filing with typed issue categories and severity (`Critical`, `Warning`).
  - Done when: issues can block interactions according to severity and role.
  - Sources: `Issues`, `Backlog`, `Wikitruth Tasks`.

- [ ] `CORE-021` Implement verdict voting with configurable threshold (default `>= 2/3 reviewer consensus`).
  - Done when: verdict transitions only occur when threshold is met and vote provenance is retained.
  - Sources: `Development Phases`, `Backlog`, `Wikitruth Tasks`.

- [ ] `CORE-022` Implement separation of epistemic verdicts vs moral/value judgements.
  - Done when: truth and ethics verdict channels are distinct in schema and UI.
  - Sources: `Wikitruth Notes`, `Backlog`, `Research Features`.

- [ ] `CORE-023` Implement reader feedback signals (`controversial`, `incorrect verdict`, `needs reevaluation`, `wrong category/parent`).
  - Done when: reader voice signals create triage events without direct status mutation.
  - Sources: `Reader voice`, `Development Phases`, `Backlog`.

- [ ] `CORE-024` Implement report/appeal process on verdict/issue actions.
  - Done when: appeals open linked discussion threads and notify responsible reviewers.
  - Sources: `Backlog`, `Wikitruth Tasks`.

- [ ] `CORE-025` Implement unresolved-content expiry/archive policy.
  - Done when: unresolved stale items are auto-archived per policy with override capability.
  - Deferred by explicit product decision (2026-07-12): unresolved records remain human-resolved; no automatic expiry or destructive mutation.
  - Sources: `Mechanics & Architecture`, `Development Phases`.

- [ ] `CORE-026` Implement issue-first moderation gate (major issues must be resolved before continued debate).
  - Done when: blocking rules prevent progression in strict threads until critical issues are resolved.
  - Sources: `Issues`, `Backlog`, `Scenarios & Use Cases`.

## E. Artifact and Evidence Foundation

- [ ] `CORE-027` Implement `Artifact` as first-class entry with media subtype metadata.
  - Done when: artifact supports `Quote`, `Photo`, `Video`, `Document`, `Dataset`, `News`, `Post`, etc.
  - Sources: `Wikitruth Tasks`, `Development Phases`, `Note to self`.

- [ ] `CORE-028` Implement artifact provenance fields (`source_url`, `origin_type`, `capture_date`, `verifiability_notes`).
  - Done when: source quality and provenance are visible during review.
  - Sources: `Mechanics & Architecture`, `Acceptance & Verdict`.

- [ ] `CORE-029` Implement internal artifact storage plus external-link mode.
  - Done when: artifact can be hosted internally or referenced externally with unified moderation.
  - Sources: `Development Phases`, `Wikitruth Tasks`.

## F. Security and Ops Baseline

- [ ] `CORE-030` Implement full backup/restore path for production data.
  - Done when: restore runbook is tested and can restore complete state in staging.
  - Sources: `Wikitruth Tasks`.

- [ ] `CORE-031` Resolve build/runtime blockers for production (`grunt`, `pm2`, prod mode start).
  - Done when: CI and PM2 deployment path are stable across restarts.
  - Sources: `Wikitruth Tasks`.

- [ ] `CORE-032` Implement HTML sanitization and XSS defense for rich text fields.
  - Done when: sanitizer policy is enforced on write and validated in security tests.
  - Sources: `Development Phases`, `References & Related Materials`.

- [ ] `CORE-033` Implement auth providers and session hardening (Google/GitHub/Facebook + secure session transitions).
  - Done when: login/registration and provider callback flows pass end-to-end tests.
  - Sources: `Backlog`, `Wikitruth Tasks`.

- [ ] `CORE-034` Implement immutable audit timeline for all privileged actions.
  - Done when: every moderation/verdict/role-change operation produces signed timeline events.
  - Sources: `Backlog`, `Mechanics & Architecture`.

- [ ] `CORE-035` Implement OpenGraph/meta tags for entry pages.
  - Done when: social previews resolve correctly for topic/argument/artifact pages.
  - Sources: `Wikitruth Tasks`.
