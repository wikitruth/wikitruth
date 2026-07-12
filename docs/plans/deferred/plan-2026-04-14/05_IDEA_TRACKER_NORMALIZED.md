# Normalized Idea Tracker

- Status values: `todo`, `in_progress`, `blocked`, `done`, `deferred`.
- Default status for all items below: `todo`.

| ID | Bucket | Status | Item | Primary Sources |
| --- | --- | --- | --- | --- |
| CORE-001 | Core Platform | todo | Implement unified Entry type system with first-class types: Topic, Argument, Question, Answer, Issue, Comment, Artifact, Definition. | Mechanics & Architecture, Wikitruth Tasks, Wikitruth Notes, Design/*.smmx, Entity Hierarchy.gliffy. |
| CORE-002 | Core Platform | done | Implement strict duplicate prevention and duplicate merge workflow for Topic, Argument, and Question. | Content Duplicates, Backlog, Research Features. |
| CORE-003 | Core Platform | todo | Implement parent/child and link relationship model with explicit link types (Child, Support, Against, Related, Source, Reference). | Wikitruth Tasks, Backlog, Research Features. |
| CORE-004 | Core Platform | todo | Implement topic/argument status taxonomies and enforce enum-driven statuses. | Acceptance & Verdict, Backlog, Mechanics & Architecture, Wikitruth Notes. |
| CORE-005 | Core Platform | todo | Implement dictionary many-to-many model (Word -> Meanings, Meaning -> Words). | Development Phases, Wikitruth Tasks, Dictionary.smmx. |
| CORE-006 | Core Platform | todo | Implement tag framework with taxonomy groups (Category, Issue, Reliability, Reality, Property). | Issues, Development Phases, Wikitruth Tasks. |
| CORE-007 | Core Platform | todo | Implement entry reference date and fragility metadata (as_of_date, fragile_fact_flag, outdated_flag). | Backlog, Research Features, Development Phases. |
| CORE-008 | Core Platform | todo | Implement outline model for topic composition (primary claims, subtopics, FAQ, ordered blocks). | Wikitruth Notes, Backlog, Research Features, Topics to create. |
| CORE-009 | Core Platform | todo | Implement role hierarchy: Anonymous, Reader, Contributor, Screener, Reviewer, Admin. | Users, Scenarios & Use Cases, Wikitruth Tasks. |
| CORE-010 | Core Platform | done | Implement onboarding requirements for Contributor/Reviewer progression. | Users, Note to self, Wikitruth Notes. |
| CORE-011 | Core Platform | todo | Implement reviewer promotion/demotion audit trail and vote-based moderation checks. | Mechanics & Architecture. |
| CORE-012 | Core Platform | todo | Implement privacy and identity protection controls (minimum public PII, strict backup policy for sensitive fields). | Wikitruth Tasks Security section. |
| CORE-013 | Core Platform | todo | Implement lifecycle states: Pending Screening -> Screened -> Reviewed/Verified with rejection/resubmit paths. | Development Phases, Wikitruth Tasks, Backlog. |
| CORE-014 | Core Platform | done | Implement Change Request (CR) workflow with partial accept/reject and diff preview. | Change Request (CR), Versioning & History. |
| CORE-015 | Core Platform | done | Implement conflict handling for stale CRs and manual merge dispute flow. | Change Request (CR). |
| CORE-016 | Core Platform | done | Implement version history with reversible revisions and reviewer-approved rollback. | Versioning & History, Change Request (CR), Development Phases. |
| CORE-017 | Core Platform | done | Implement edit suggestions for restricted entries and author/editor assignment controls. | Backlog, Mechanics & Architecture. |
| CORE-018 | Core Platform | todo | Implement ownership and collaborator model for co-maintained topics. | Wikitruth Tasks. |
| CORE-019 | Core Platform | done | Implement controlled anonymous contribution with rate limits and anti-abuse checks. | Backlog, Mechanics & Architecture. |
| CORE-020 | Core Platform | todo | Implement issue filing with typed issue categories and severity (Critical, Warning). | Issues, Backlog, Wikitruth Tasks. |
| CORE-021 | Core Platform | todo | Implement verdict voting with configurable threshold (default >= 2/3 reviewer consensus). | Development Phases, Backlog, Wikitruth Tasks. |
| CORE-022 | Core Platform | done | Implement separation of epistemic verdicts vs moral/value judgements. | Wikitruth Notes, Backlog, Research Features. |
| CORE-023 | Core Platform | todo | Implement reader feedback signals (controversial, incorrect verdict, needs reevaluation, wrong category/parent). | Reader voice, Development Phases, Backlog. |
| CORE-024 | Core Platform | todo | Implement report/appeal process on verdict/issue actions. | Backlog, Wikitruth Tasks. |
| CORE-025 | Core Platform | deferred | Implement unresolved-content expiry/archive policy. Explicitly deferred on 2026-07-12; human resolution remains authoritative. | Mechanics & Architecture, Development Phases. |
| CORE-026 | Core Platform | done | Implement issue-first moderation gate (major issues must be resolved before continued debate). | Issues, Backlog, Scenarios & Use Cases. |
| CORE-027 | Core Platform | done | Implement Artifact as first-class entry with media subtype metadata. | Wikitruth Tasks, Development Phases, Note to self. |
| CORE-028 | Core Platform | done | Implement artifact provenance fields (source_url, origin_type, capture_date, verifiability_notes). | Mechanics & Architecture, Acceptance & Verdict. |
| CORE-029 | Core Platform | done | Implement internal artifact storage plus external-link mode. | Development Phases, Wikitruth Tasks. |
| CORE-030 | Core Platform | todo | Implement full backup/restore path for production data. | Wikitruth Tasks. |
| CORE-031 | Core Platform | todo | Resolve build/runtime blockers for production (grunt, pm2, prod mode start). | Wikitruth Tasks. |
| CORE-032 | Core Platform | todo | Implement HTML sanitization and XSS defense for rich text fields. | Development Phases, References & Related Materials. |
| CORE-033 | Core Platform | todo | Implement auth providers and session hardening (Google/GitHub/Facebook + secure session transitions). | Backlog, Wikitruth Tasks. |
| CORE-034 | Core Platform | done | Implement immutable audit timeline for all privileged actions. | Backlog, Mechanics & Architecture. |
| CORE-035 | Core Platform | todo | Implement OpenGraph/meta tags for entry pages. | Wikitruth Tasks. |
| FLOW-001 | Product Workflows | todo | Implement inline create/edit/reply flows without disruptive page transitions. | Development Phases, Wikitruth Tasks, Backlog. |
| FLOW-002 | Product Workflows | todo | Implement entry creation wizard from navbar (Topic, Statement, Question) with target-context selection. | Wikitruth Tasks, Backlog. |
| FLOW-003 | Product Workflows | todo | Implement clipboard move/copy/link batch workflow across entry types. | Development Phases, Wikitruth Tasks, Backlog. |
| FLOW-004 | Product Workflows | todo | Implement entry conversion utility (Topic <-> Statement/Fact, plus supported compatible conversions). | Wikitruth Tasks, Backlog. |
| FLOW-005 | Product Workflows | todo | Implement markdown-capable editor with grammar-assist and safe rendering. | Development Phases, Wikitruth Tasks, References & Related Materials. |
| FLOW-006 | Product Workflows | todo | Implement compact, readable list cards with expand/collapse and preview controls. | Development Phases, Wikitruth Tasks, Wikitruth Notes. |
| FLOW-007 | Product Workflows | todo | Implement strict argument discussion threads with optional 1v1 alternation mode. | Scenarios & Use Cases, Mechanics & Architecture, Backlog. |
| FLOW-008 | Product Workflows | todo | Implement separate unrated discussion channel for emotional/user sentiment comments. | Scenarios & Use Cases, Development Phases. |
| FLOW-009 | Product Workflows | todo | Implement comment classifications (Supplement, Objection, Question) and routing. | Scenarios & Use Cases, Wikitruth Notes. |
| FLOW-010 | Product Workflows | done | Implement discussion obsolescence tagging when parent argument revisions invalidate old comments. | Scenarios & Use Cases, Versioning & History. |
| FLOW-011 | Product Workflows | todo | Implement issue-discussion tab and action-linked conversations (verdict, issue, move, rename, link). | Backlog, Wikitruth Tasks. |
| FLOW-012 | Product Workflows | todo | Implement thread quality constraints (max length, anti-spam cadence, repeated-post protection). | Development Phases, Scenarios & Use Cases. |
| FLOW-013 | Product Workflows | todo | Implement Home sections (Latest, Trending, Top) with mixed entry feed. | Wikitruth Tasks, Development Phases, FixthePH Notes. |
| FLOW-014 | Product Workflows | todo | Implement Explore filters by type, status, tag, screening state, and relationship. | Wikitruth Tasks, Backlog. |
| FLOW-015 | Product Workflows | todo | Implement sidebar context graph (Parent, Siblings, Children, related entries). | Wikitruth Tasks, Development Phases, Backlog. |
| FLOW-016 | Product Workflows | todo | Implement breadcrumb and context title system for deep hierarchies. | Wikitruth Tasks, FixthePH Notes. |
| FLOW-017 | Product Workflows | todo | Implement at-a-glance summary blocks targeting 5-second comprehension. | Wikitruth Tasks, Wikitruth Notes, Mechanics & Architecture. |
| FLOW-018 | Product Workflows | done | Implement archived/outdated visibility modes and reader warnings. | Development Phases, Backlog. |
| FLOW-019 | Product Workflows | done | Implement non-verdict popularity reactions (Upvote/Downvote, Expose/Bury, Good/Bad). | Development Phases, Backlog, Upvoting. |
| FLOW-020 | Product Workflows | todo | Implement reviewer-priority queues based on votes, flags, and activity. | Mechanics & Architecture, Upvoting, Scenarios & Use Cases. |
| FLOW-021 | Product Workflows | done | Implement contributor/reviewer reputation signals and weighted ranking inputs. | Research Features, Wikitruth Notes, Backlog. |
| FLOW-022 | Product Workflows | done | Implement reviewer badges and contributor profile scorecards. | Reviewer Badges, Backlog, Wikitruth Notes. |
| FLOW-023 | Product Workflows | todo | Implement unified timeline view for each entry (edits, verdicts, issues, links, discussions). | Development Phases, Wikitruth Tasks, Backlog. |
| FLOW-024 | Product Workflows | todo | Implement follow/subscribe system for entries and threads. | Development Phases, Backlog. |
| FLOW-025 | Product Workflows | todo | Implement notification center with event types (screening, verdict, reply, mention, new post). | Development Phases, Backlog. |
| FLOW-026 | Product Workflows | todo | Implement reviewer/screener queue widgets on Home. | Wikitruth Tasks, Backlog. |
| FLOW-027 | Product Workflows | todo | Implement network visualization mode for linked topics/arguments/issues/artifacts. | Development Phases, Wikitruth Tasks, References & Related Materials. |
| FLOW-028 | Product Workflows | todo | Implement timeline visualization mode with configurable depth. | Development Phases, Wikitruth Tasks. |
| FLOW-029 | Product Workflows | todo | Implement outline visualization with depth controls and weighted sections. | Research Features, Wikitruth Notes, Backlog. |
| FLOW-030 | Product Workflows | todo | Implement role-aware reading modes (Nothing but truth, Show unreviewed, Show metadata/issues). | Mechanics & Architecture, Backlog. |
| FLOW-031 | Product Workflows | todo | Implement mobile-first and desktop-optimized typography/layout presets. | Development Phases, Wikitruth Tasks, FixthePH Notes. |
| FLOW-032 | Product Workflows | todo | Implement fast list rendering and incremental loading for deep hierarchies. | Wikitruth Tasks, Backlog. |
| FLOW-033 | Product Workflows | todo | Implement keyboard shortcuts and quick action menus for heavy contributors/reviewers. | Wikitruth Tasks. |
| FLOW-034 | Product Workflows | todo | Implement semantic HTML and accessibility baseline across entry pages and dialogs. | Wikitruth Tasks. |
| FLOW-035 | Product Workflows | todo | Implement UX quality guardrails against clutter and verbosity (compact defaults, concise previews, scoped expansions). | Backlog, Note to self, Wikitruth Notes. |
| CONTENT-001 | Content Ops | done | Publish contributor/reviewer guidelines (allowed, discouraged, prohibited patterns). | Note to self, Backlog, Wikitruth Notes, Project Overview. |
| CONTENT-002 | Content Ops | done | Publish issue taxonomy handbook with examples and moderation outcomes. | Issues, Backlog, Wikitruth Tasks. |
| CONTENT-003 | Content Ops | done | Publish verdict policy handbook distinguishing Verified, Pending, Likely, Unsupported, False, Partial. | Acceptance & Verdict, Backlog, Wikitruth Notes. |
| CONTENT-004 | Content Ops | done | Publish duplicate/similarity policy and merge decision rules. | Content Duplicates, Backlog, Wikitruth Tasks. |
| CONTENT-005 | Content Ops | done | Publish truth-vs-ethics separation policy with examples. | Wikitruth Notes, Backlog, Mechanics & Architecture. |
| CONTENT-006 | Content Ops | done | Define source quality rubric for artifacts and references. | Mechanics & Architecture, References & Related Materials, Note to self. |
| CONTENT-007 | Content Ops | todo | Create seed structure for top 3 priority topics with complete skeletons. | Topics to create, Backlog, Development Phases. |
| CONTENT-008 | Content Ops | todo | Launch reviewer-created empty starter topics/arguments for high-impact areas. | Scenarios & Use Cases, Development Phases. |
| CONTENT-009 | Content Ops | todo | Implement “critical topic first” roadmap (high-impact controversy-first publishing order). | Research Features, Topics to create, Note to self. |
| CONTENT-010 | Content Ops | todo | Build topic templates by category (Science, History, Religion, Morality, Public Policy). | Project Overview, Wikitruth Notes, Topics to create. |
| CONTENT-011 | Content Ops | done | Add “fragile fact” date labeling policy for rapidly changing claims. | Backlog, Research Features. |
| CONTENT-012 | Content Ops | todo | Create examples library for each entry type and quality level. | Backlog, Wikitruth Notes. |
| CONTENT-013 | Content Ops | done | Stand up screening operations playbook (pending, approved, rejected, returned with issues). | Backlog, Wikitruth Tasks. |
| CONTENT-014 | Content Ops | done | Stand up reviewer operations playbook (verdict assignment, issue escalation, appeal handling). | Development Phases, Backlog, Issues. |
| CONTENT-015 | Content Ops | done | Implement stale discussion cleanup procedures (obsolescence tags, archive, takeover windows). | Scenarios & Use Cases, Mechanics & Architecture. |
| CONTENT-016 | Content Ops | done | Define and enforce concise-writing standard to prevent encyclopedic drift. | Note to self, Mechanics & Architecture, Wikitruth Notes. |
| CONTENT-017 | Content Ops | done | Define contributor incentives (credits, attribution, profile progress) tied to quality. | Scenarios & Use Cases, Backlog, Wikitruth Tasks. |
| FIXPH-001 | FixPH | done | Implement FixPH section architecture (Issues & Events, People, Groups, Projects, Actions, Vote Wisely, History). | fixthephilippines.org/fixthephilippines.org, FixthePH Notes. |
| FIXPH-002 | FixPH | done | Implement government/entity graph model (country -> institution -> office -> person + incidents/issues/projects). | fixthephilippines.org/fixthephilippines.org, fixtheph.smmx, Linking.smmx. |
| FIXPH-003 | FixPH | done | Implement accountability views for projects (budget, officials, contract, timeline, progress evidence). | fixthephilippines.org/fixthephilippines.org, FixthePH Notes. |
| FIXPH-004 | FixPH | done | Implement citizen observation submissions and issue escalation flow. | fixthephilippines.org/fixthephilippines.org, FixthePH Notes. |
| FIXPH-005 | FixPH | done | Implement location-aware issue/event surfacing for citizens. | FixthePH Notes, Development Phases. |
| FIXPH-006 | FixPH | done | Implement election guidance workspace with candidate issue profiles. | FixthePH Notes, Topics to create. |
| FIXPH-007 | FixPH | done | Implement issue severity and stage model for public incident tracking. | FixthePH Notes, Wikitruth Tasks. |
| FIXPH-008 | FixPH | done | Implement long-lived historical memory mechanism (“system does not forget”). | FixthePH Notes, fixthephilippines.org/fixthephilippines.org. |
| CONTENT-018 | Content Ops | deferred | Run controlled pilot with 2-person custom debate on seeded topic; deferred with broad strict-debate rollout. | Development Phases. |
| CONTENT-019 | Content Ops | todo | Run policy stress test on controversial topics with reviewer calibration. | Topics to create, Research Features, Backlog. |
| CONTENT-020 | Content Ops | todo | Ship v1 “truth + issue tracking” baseline with one strong flagship topic and one FixPH flagship issue cluster. | Backlog, Wikitruth Tasks, FixthePH Notes. |
