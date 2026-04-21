# FixPH Civic Extension

## Purpose

FixThePH is modeled as a civic-accountability extension that applies Wikitruth mechanics to governance, public issues, and election decision support.

## Core Objectives

- Help citizens identify, report, and track systemic issues.
- Preserve institutional memory so major issues are not forgotten.
- Improve accountability by linking issues to responsible people/offices/projects.
- Surface practical citizen suggestions and policy-relevant signals.

## Information Architecture (Normalized)

Top-level sections repeatedly referenced:

1. Issues and Events
2. People
3. Groups and Organizations
4. Projects
5. Actions
6. Vote Wisely
7. History

## Civic Domain Model

Primary entities:

- `Country`
- `Institution`
- `Organization`
- `Office`
- `Person`
- `Project`
- `Incident`
- `Issue`
- `Action`

Core links:

- person to office
- office to institution/organization
- project to office/person and budget/contracts/timeline
- incident/issue to involved entities and evidence artifacts

## FixPH-Specific Functional Expectations

- Project accountability pages:
  - budget
  - officials
  - contracts
  - timeline/progress
  - citizen evidence uploads

- Civic observation pipeline:
  - citizen reports
  - status escalation
  - discussion and verification

- Election support:
  - candidate profile comparison
  - track record of achievements/issues
  - evidence-linked claims and counterclaims

- Long-memory behavior:
  - preserve past incidents and connect to follow-up outcomes.

## Data Quality and Risk Controls

Many imported civic notes are raw allegation lists.

Required control policy:

- classify as unverified claim intake by default
- require artifact-backed evidence and issue review
- distinguish allegation from validated finding
- preserve provenance and moderation trail for contentious claims

## Relationship to Core Wikitruth

FixPH reuses core mechanics:

- topic/statement/issue/artifact model
- review and verdict lifecycle
- timeline and visualization behaviors

FixPH adds domain-specific semantics:

- institutions/offices/responsibility chains
- project and incident accountability states
- election-oriented comparison workflows

