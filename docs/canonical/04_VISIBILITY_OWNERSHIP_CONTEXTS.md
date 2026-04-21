# Canonical Card: Visibility, Ownership, and Context

## Purpose

Define how access scope and context are resolved for content.

## Visibility Modes

- Public wiki scope: non-private content intended for shared discovery.
- Journal scope: private, user-owned content.
- Group scope: group-owned content gated by group privacy/membership rules.

## API View Filter Contract

- `view=all`: include all screening states.
- `view=wiki`: accepted-only view.
- `view=original`: pending-only view.
- default: uses route-specific default screening status.

## Ownership Resolution

- Ownership is represented by `ownerType` + `ownerId`, optionally with `parentId`.
- Context helpers derive effective base URL context:
- global wiki
- group wiki
- member journal/profile wiki

## Profile and Journal Privacy Rules

- Private member profiles are visible only to self/admin.
- Journal entries are private and visible only to self/admin.
- Non-owners are filtered away from private entries in list/discovery flows.

## Group Privacy Rules

- Public groups are globally visible.
- Closed/secret groups require membership (or admin privileges) to view protected content.
- Group managers/admins control group updates and membership management.

## Ownership Migration Guardrails

- Ownership migration is limited to root topics.
- Group-scoped topics are excluded from journal/public migration path.
- Journal migration requires target username and enforces creator-match policy unless ownership is explicitly transferred first.
