# Canonical Card: Domain Graph and Entries

## Purpose

Define the core knowledge graph objects and how they relate.

## Primary Content Entities

- `Topic`
- `Argument`
- `Question`
- `Answer`
- `Issue`
- `Opinion`
- `Artifact`

## Supporting Graph Entities

- `TopicLink` and `ArgumentLink` (explicit graph linking objects)
- `ObjectLink` (generic linking support)
- `Group`, `Page`, dictionary models (`Word`, `Meaning`, `Definition`)
- Integrity and governance models: `EntryRevision`, `ChangeRequest`, `EntryRedirect`, `EntryEvent`, `ReaderSignal`, and `VerdictVote`.
- Extension models: `AnonymousContribution`, `ReputationSnapshot`, and `CivicRecord`.

## Shared Entry Shape (Cross-Entity Pattern)

- Editorial fields: `title`, `content`, `references`, `friendlyUrl`.
- Time-sensitive entries may include `referenceDate`; artifacts additionally carry subtype, provenance, and source-quality metadata.
- Ownership and placement: `ownerType`, `ownerId`, optional `parentId`, optional `groupId`.
- Moderation fields: `screening.status`, `screening.history`.
- Privacy flag: `private`.
- Aggregate counters: `childrenCount` bucketed by child type and moderation status.

## Verdict Scope

- `Topic`, `Argument`, and `Answer` support independently queryable factual and ethical verdict channels with reasoning, evidence references, editor, and date metadata.
- Factual channel updates preserve the legacy verdict projection for compatibility.
- Reviewer votes and deterministic consensus summaries are channel-specific.
- Consensus is the normal final-decision source; an explicitly labeled and audited administrator override may publish the final channel state.
- Final channel state preserves decision mode, policy version, decision provenance, and the available consensus snapshot.

## Graph Invariant

Entries are not flat records. Every entry is expected to be in a context (topic, argument thread, group, or user/journal ownership) and that context drives visibility, routing, and child-count aggregation.

Graph links are governed content mutations. Creation requires contributor authorization and onboarding, and successful changes create revision and audit evidence.
