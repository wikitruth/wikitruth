# Domain Model and Information Architecture

## Canonical Entity Set

Normalized from notes, mechanics docs, and diagram artifacts.

1. `Topic`
- Umbrella container for a subject area.
- Can include subtopics, statements/arguments, questions, issues, and artifacts.

2. `Statement` (historically also called `Argument` or `Fact`)
- Atomic claim unit.
- Supports pro/against relationships and evidence links.

3. `Question`
- Doubt/clarification unit linked to topics or statements.

4. `Answer`
- Response unit tied to a question.

5. `Issue`
- Structured defect/risk annotation (logic, terminology, ambiguity, evidence gap, etc).

6. `Opinion` / `Comment`
- Discussion layer for user exchange.
- Should be separated from verdict authority.

7. `Artifact`
- Evidence/source item (document, image, quote, link, dataset, etc).

8. `Definition`
- Dictionary word-meaning mapping for terminology clarity.

## Entity Relationships

Primary hierarchy:

- `Category -> Topic -> Statement -> Discussion`

Cross-links:

- `Topic <-> Topic` (related, dependency, parent/child)
- `Statement <-> Statement` (support, against, related)
- `Question <-> Statement/Topic`
- `Issue -> any content entity`
- `Artifact -> Topic/Statement/Question/Issue` as evidence/reference

## Link Taxonomy (Normalized)

Recommended baseline relation types:

- `child`
- `parent`
- `support`
- `against`
- `related`
- `source`
- `reference`
- `dependency`

## Status and Classification Fields

Per-content status dimensions implied by source docs:

- review status: pending/screened/reviewed/verified/rejected
- issue severity: warning/critical
- temporal status: active/outdated/archived
- claim type: factual/ethical/prediction/historical

## Tag Taxonomy

Suggested layered tags:

1. classification tags
- person, event, process, institution, etc

2. issue tags
- logical fallacy, terminology issue, unsupported assumption, ambiguity

3. reliability tags
- evidence quality, reasoning quality

4. property tags
- author, last editor, date, source metadata

## Outline and Reading Structure

Topic-level reading model repeatedly referenced in source docs:

- at-a-glance summary
- key statements (pro/against)
- key questions/answers
- key issues
- related topics
- references/artifacts

## Diagram-Derived Signals

Extracted from design artifacts:

- `Entity Hierarchy.gliffy`: Topic -> Argument/Question/Issue/Answer/Comment relationships.
- `Wikitruth.smmx`: users and roles interacting with Topic/Argument/Question/Answer/Definition/Tagging.
- `Linking.smmx`: location and governance linking examples (`Philippines -> Provinces -> Government -> PNP -> Issues`).
- `Dictionary.smmx`: many-words-to-many-meanings dictionary concept.
- `fixtheph.smmx`: Person/Politician, Incidents, Groups/Orgs, Government, Departments, Projects, Issues.

