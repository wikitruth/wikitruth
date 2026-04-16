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

## Shared Entry Shape (Cross-Entity Pattern)

- Editorial fields: `title`, `content`, `references`, `friendlyUrl`.
- Ownership and placement: `ownerType`, `ownerId`, optional `parentId`, optional `groupId`.
- Moderation fields: `screening.status`, `screening.history`.
- Privacy flag: `private`.
- Aggregate counters: `childrenCount` bucketed by child type and moderation status.

## Verdict Scope

- Verdict metadata exists on `Topic` and `Argument` (status plus editor/date metadata).
- Verdict statuses include binary and nuanced likelihood states (for example `status_true`, `status_false`, `likely`, `very_unlikely`, `misleading_invalid`).

## Graph Invariant

Entries are not flat records. Every entry is expected to be in a context (topic, argument thread, group, or user/diary ownership) and that context drives visibility, routing, and child-count aggregation.
