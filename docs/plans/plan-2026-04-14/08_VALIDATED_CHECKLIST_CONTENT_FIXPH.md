# Validated Checklist: Content Ops and FixPH (Code-Rechecked)

Date validated: 2026-04-18  
Validation basis: current repository code + repository docs only.

Status legend:
- `implemented`
- `partial`
- `not_implemented`

## A. Content Governance and Policy Rollout

| ID | Status | Evidence in code/docs | Gap / Not implemented |
| --- | --- | --- | --- |
| CONTENT-001 | `partial` | Some inline creation-page guidance exists (for example topic/argument guidelines in create forms). | No versioned contributor/reviewer policy pack wired into onboarding and editor policy links. |
| CONTENT-002 | `partial` | Issue taxonomy exists in constants and issue create/edit form options. | No published issue handbook with examples and expected moderation outcomes. |
| CONTENT-003 | `partial` | Verdict statuses/labels exist in constants and moderation UI. | No formal published verdict policy handbook and reviewer training artifacts in-repo. |
| CONTENT-004 | `not_implemented` | Requirement appears in imported planning docs, but not in product docs/workflow. | No published duplicate/similarity policy or deterministic merge rulebook. |
| CONTENT-005 | `partial` | Ethical/factual distinctions exist in schema/constants (`ethicalStatus`, argument types). | No explicit truth-vs-ethics policy documentation with contributor examples. |
| CONTENT-006 | `not_implemented` | Artifact source field exists; no rubric document or scoring model found. | No source quality rubric for evidence reliability/provenance consistency. |

## B. Seed Content Strategy (Wikitruth)

| ID | Status | Evidence in code/docs | Gap / Not implemented |
| --- | --- | --- | --- |
| CONTENT-007 | `not_implemented` | No repository artifact proving top-3 seeded topic skeletons were created with full structure. | Seed skeleton execution (overview/pro-anti/questions/issues/references) is not captured as completed deliverables. |
| CONTENT-008 | `not_implemented` | No starter-topic provisioning workflow with explicit “contribution target” labeling found. | Missing reviewer-created starter content lifecycle and discoverability marker. |
| CONTENT-009 | `not_implemented` | No roadmap-priority engine found in code for “critical topic first” publishing order. | No implemented prioritization queue by social impact/confusion reduction. |
| CONTENT-010 | `partial` | Topic create UI includes category selector. | No category-specific topic templates that auto-generate required sections/warnings. |
| CONTENT-011 | `partial` | `referenceDate` exists on core schemas (topic/argument). | No policy-driven fragile-fact label/stale notice behavior in modern UI flows. |
| CONTENT-012 | `not_implemented` | No examples library/help panel discovered for entry quality examples. | Missing per-entry-type exemplars integrated into editor UX. |

## C. Content Operations and Curation Workflows

| ID | Status | Evidence in code/docs | Gap / Not implemented |
| --- | --- | --- | --- |
| CONTENT-013 | `not_implemented` | Screening functionality exists technically (`/screening`, moderation APIs). | No documented screening operations playbook with SLAs and repeatable process docs. |
| CONTENT-014 | `not_implemented` | Verdict/issue tools exist technically (moderation + issue APIs). | No reviewer operations playbook (escalation/appeals/turnaround standards). |
| CONTENT-015 | `not_implemented` | No stale-discussion cleanup procedures discovered in code/docs. | Missing obsolescence, archive, and takeover procedural workflow. |
| CONTENT-016 | `partial` | Minimum content-length validation exists in create/update APIs. | No explicit concise-writing policy enforcement against encyclopedic drift beyond basic length guards. |
| CONTENT-017 | `partial` | Profile contributions and attribution surfaces exist. | No explicit incentive framework (credits/progress/quality-weighted rewards). |

## D. FixThePH Execution Track

| ID | Status | Evidence in code/docs | Gap / Not implemented |
| --- | --- | --- | --- |
| FIXPH-001 | `partial` | `server/src/models/applications.ts` defines FixPH app shell and sections: People, Incidents, Projects, Organizations, Election. | Missing explicit `Actions`, `Vote Wisely` workspace UX, and `History` section architecture parity from checklist. |
| FIXPH-002 | `partial` | Generic topic/entity graph and link model exist (`Topic`, links, outline). | No dedicated government hierarchy model (country->institution->office->person) with responsibility mapping semantics. |
| FIXPH-003 | `not_implemented` | No dedicated project accountability schema/views found. | Missing project accountability fields and pages (budget/officials/contracts/timeline/progress evidence). |
| FIXPH-004 | `partial` | Generic artifact and issue submission flows exist. | No FixPH-specific citizen observation pipeline with escalation statuses/tracking UX. |
| FIXPH-005 | `not_implemented` | No geo fields/filtering/location pipeline found for issues/events. | Missing location-aware surfacing for nearby incidents/projects. |
| FIXPH-006 | `partial` | FixPH “Election” section exists conceptually in application metadata. | No dedicated Vote Wisely workspace with side-by-side candidate evidence profiles. |
| FIXPH-007 | `partial` | Issue severity proxy exists via issue types (`critical` flag). | No incident stage model and public escalation lifecycle for civic tracking. |
| FIXPH-008 | `partial` | Archived screening state exists and historical entries remain queryable. | No explicit “system does not forget” mechanism linking old incidents to follow-up actions/governance outcomes. |

## E. Validation and Pilot Rollout

| ID | Status | Evidence in code/docs | Gap / Not implemented |
| --- | --- | --- | --- |
| CONTENT-018 | `not_implemented` | No pilot execution artifact in repo (tests/report/docs) for controlled 2-person custom debate run. | Pilot has not been captured as completed operational validation. |
| CONTENT-019 | `not_implemented` | No policy stress-test dataset/report found for controversial topic reviewer calibration. | Missing calibration workflow and conflict log outputs. |
| CONTENT-020 | `partial` | Baseline create/screen/review/verdict/discussion paths are present in modern product. | End-to-end “flagship topic + flagship FixPH cluster” rollout evidence, plus appeal completeness/stability, is not present. |

## Summary

- `implemented`: 0
- `partial`: 14
- `not_implemented`: 14

Primary gaps are policy-document rollout, operational playbooks, seeded content execution artifacts, and most FixPH-specific product mechanics.

Revalidation note (2026-04-18): migration-closure execution focused on core platform and product workflow parity. Content/FixPH status distribution remains unchanged in this pass.
