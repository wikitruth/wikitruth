# Content and FixPH Implementation Checklist

Scope: content operations, seed-topic execution, governance policy rollout, and FixThePH deployment track.

## A. Content Governance and Policy Rollout

- [ ] `CONTENT-001` Publish contributor/reviewer guidelines (allowed, discouraged, prohibited patterns).
  - Done when: guidelines are versioned, visible in onboarding, and linked in editor flows.
  - Sources: `Note to self`, `Backlog`, `Wikitruth Notes`, `Project Overview`.

- [ ] `CONTENT-002` Publish issue taxonomy handbook with examples and moderation outcomes.
  - Done when: each issue type has definition, sample cases, and expected reviewer action.
  - Sources: `Issues`, `Backlog`, `Wikitruth Tasks`.

- [ ] `CONTENT-003` Publish verdict policy handbook distinguishing `Verified`, `Pending`, `Likely`, `Unsupported`, `False`, `Partial`.
  - Done when: verdict policy is consistent in UI labels, docs, and reviewer training.
  - Sources: `Acceptance & Verdict`, `Backlog`, `Wikitruth Notes`.

- [ ] `CONTENT-004` Publish duplicate/similarity policy and merge decision rules.
  - Done when: moderators can run deterministic duplicate handling without ad hoc decisions.
  - Sources: `Content Duplicates`, `Backlog`, `Wikitruth Tasks`.

- [ ] `CONTENT-005` Publish truth-vs-ethics separation policy with examples.
  - Done when: contributors understand where moral arguments belong vs epistemic claims.
  - Sources: `Wikitruth Notes`, `Backlog`, `Mechanics & Architecture`.

- [ ] `CONTENT-006` Define source quality rubric for artifacts and references.
  - Done when: reviewers can score source reliability and provenance consistently.
  - Sources: `Mechanics & Architecture`, `References & Related Materials`, `Note to self`.

## B. Seed Content Strategy (Wikitruth)

- [ ] `CONTENT-007` Create seed structure for top 3 priority topics with complete skeletons.
  - Done when: each seed topic has overview, pro/against claims, key questions, issues, and references.
  - Sources: `Topics to create`, `Backlog`, `Development Phases`.

- [ ] `CONTENT-008` Launch reviewer-created empty starter topics/arguments for high-impact areas.
  - Done when: starter topics are discoverable and clearly marked as contribution targets.
  - Sources: `Scenarios & Use Cases`, `Development Phases`.

- [ ] `CONTENT-009` Implement “critical topic first” roadmap (high-impact controversy-first publishing order).
  - Done when: topic queue prioritizes societal impact and confusion reduction.
  - Sources: `Research Features`, `Topics to create`, `Note to self`.

- [ ] `CONTENT-010` Build topic templates by category (`Science`, `History`, `Religion`, `Morality`, `Public Policy`).
  - Done when: templates generate required sections and policy-specific warnings.
  - Sources: `Project Overview`, `Wikitruth Notes`, `Topics to create`.

- [ ] `CONTENT-011` Add “fragile fact” date labeling policy for rapidly changing claims.
  - Done when: claims requiring dated context show `as of` indicators and stale notices.
  - Sources: `Backlog`, `Research Features`.

- [ ] `CONTENT-012` Create examples library for each entry type and quality level.
  - Done when: contributors can compare good vs poor examples in editor help panel.
  - Sources: `Backlog`, `Wikitruth Notes`.

## C. Content Operations and Curation Workflows

- [ ] `CONTENT-013` Stand up screening operations playbook (`pending`, `approved`, `rejected`, `returned with issues`).
  - Done when: screeners follow repeatable steps and SLA expectations.
  - Sources: `Backlog`, `Wikitruth Tasks`.

- [ ] `CONTENT-014` Stand up reviewer operations playbook (verdict assignment, issue escalation, appeal handling).
  - Done when: reviewer actions follow policy and have measurable turnaround targets.
  - Sources: `Development Phases`, `Backlog`, `Issues`.

- [ ] `CONTENT-015` Implement stale discussion cleanup procedures (obsolescence tags, archive, takeover windows).
  - Done when: obsolete discussions are handled consistently and transparently.
  - Sources: `Scenarios & Use Cases`, `Mechanics & Architecture`.

- [ ] `CONTENT-016` Define and enforce concise-writing standard to prevent encyclopedic drift.
  - Done when: overlong or low-signal entries are flagged and corrected during screening.
  - Sources: `Note to self`, `Mechanics & Architecture`, `Wikitruth Notes`.

- [ ] `CONTENT-017` Define contributor incentives (credits, attribution, profile progress) tied to quality.
  - Done when: incentives reward useful, policy-compliant contribution and review.
  - Sources: `Scenarios & Use Cases`, `Backlog`, `Wikitruth Tasks`.

## D. FixThePH Execution Track

- [ ] `FIXPH-001` Implement FixPH section architecture (`Issues & Events`, `People`, `Groups`, `Projects`, `Actions`, `Vote Wisely`, `History`).
  - Done when: all sections are navigable and support core listing/detail patterns.
  - Sources: `fixthephilippines.org/fixthephilippines.org`, `FixthePH Notes`.

- [ ] `FIXPH-002` Implement government/entity graph model (country -> institution -> office -> person + incidents/issues/projects).
  - Done when: entity pages can be linked to responsibilities and related incidents/projects.
  - Sources: `fixthephilippines.org/fixthephilippines.org`, `fixtheph.smmx`, `Linking.smmx`.

- [ ] `FIXPH-003` Implement accountability views for projects (budget, officials, contract, timeline, progress evidence).
  - Done when: project pages expose accountability metadata with supporting artifacts.
  - Sources: `fixthephilippines.org/fixthephilippines.org`, `FixthePH Notes`.

- [ ] `FIXPH-004` Implement citizen observation uploads and issue escalation flow.
  - Done when: citizens can submit observations with evidence and track status.
  - Sources: `fixthephilippines.org/fixthephilippines.org`, `FixthePH Notes`.

- [ ] `FIXPH-005` Implement location-aware issue/event surfacing for citizens.
  - Done when: users can track nearby incidents/projects via configured locations.
  - Sources: `FixthePH Notes`, `Development Phases`.

- [ ] `FIXPH-006` Implement election guidance workspace with candidate issue profiles.
  - Done when: `Vote Wisely` supports side-by-side candidate records with evidence links.
  - Sources: `FixthePH Notes`, `Topics to create`.

- [ ] `FIXPH-007` Implement issue severity and stage model for public incident tracking.
  - Done when: incidents can be grouped and escalated by stage/severity.
  - Sources: `FixthePH Notes`, `Wikitruth Tasks`.

- [ ] `FIXPH-008` Implement long-lived historical memory mechanism (“system does not forget”).
  - Done when: archived incidents remain queryable and linked to follow-up actions.
  - Sources: `FixthePH Notes`, `fixthephilippines.org/fixthephilippines.org`.

## E. Validation and Pilot Rollout

- [ ] `CONTENT-018` Run controlled pilot with 2-person custom debate on seeded topic.
  - Done when: pilot captures flow breakpoints and policy gaps for remediation.
  - Sources: `Development Phases`.

- [ ] `CONTENT-019` Run policy stress test on controversial topics with reviewer calibration.
  - Done when: inter-reviewer agreement improves and unresolved policy conflicts are logged.
  - Sources: `Topics to create`, `Research Features`, `Backlog`.

- [ ] `CONTENT-020` Ship v1 “truth + issue tracking” baseline with one strong flagship topic and one FixPH flagship issue cluster.
  - Done when: end-to-end create -> screen -> review -> verdict -> discussion -> appeal workflow is stable.
  - Sources: `Backlog`, `Wikitruth Tasks`, `FixthePH Notes`.
