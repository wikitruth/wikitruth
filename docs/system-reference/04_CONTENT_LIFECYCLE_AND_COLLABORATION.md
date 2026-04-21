# Content Lifecycle and Collaboration

## Authoring Workflow

Normalized flow from mechanics/tasks/backlog notes:

1. Create
- New Topic/Statement/Question/Artifact from contextual entry points.

2. Link
- Connect to parent/topic and relation type (support/against/related/source).

3. Screen
- Initial moderation pass for structural quality and relevance.

4. Review
- Issue filing, evidence assessment, and verdict vote processing.

5. Publish
- Display with status, issue markers, and source traceability.

6. Evolve
- Changes go through controlled revision/CR process.

## Change Requests (CR)

Source docs strongly support a PR-like edit model.

CR mechanics (normalized):

- CR can include add/delete/amend fragments.
- Reviewers can accept/reject whole or partial CRs.
- Accepted CR increments version.
- Pending CRs become outdated/conflicting as base version changes.
- Conflicting CRs require rebase/merge resolution.
- Merge actions must be logged and reversible.

## Revision and History

Expected capabilities:

- versioned history per entry
- visible before/after diffs
- linked discussion on changes
- rollback path for bad merges

Open design choice from sources:

- fragment-level revision vs block-level discussion coherence

Recommended practical direction:

- block-level rendering for readability,
- fragment-level internal diff metadata for precision.

## Duplicate Control

Core rule repeated in multiple docs:

- no duplicate topic/statement/question records

Required supporting mechanics:

- similarity detection on create/edit
- merge workflow with redirect metadata
- provenance retention after merge

## Collaboration Modes

Source notes suggest mixed collaboration controls:

- open editable entries in early lifecycle
- restricted entries after higher review stages
- suggestion-only mode for protected/high-value entries
- collaborator assignment for shared curation contexts

## Quality Controls

- concise writing preference over long unstructured blocks
- anti-noise rules for irrelevant or repetitive points
- contextual integrity checks for parent-child coherence
- structured tagging and issue labels over freeform moderation

## Unrated vs Rated Discussion

Recurring model in source docs:

- rated/strict discussion for truth-oriented argument progression
- unrated/free-expression channel for sentiment and reactions

Implementation implication:

- keep channels separate to avoid contaminating verdict quality.

