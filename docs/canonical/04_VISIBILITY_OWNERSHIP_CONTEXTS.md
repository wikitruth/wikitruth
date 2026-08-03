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
- `view=active`: accepted and pending content.
- `view=original`: pending-only view.
- `view=archived`: retained historical content only.
- default: uses route-specific default screening status.

The modern client presents these modes as `All states`, `Accepted`, `Pending`, and `Archived` without changing the compatibility API values.

## Reader Visibility Preference

- The application-wide reader preference is one of `Accepted only`, `Accepted + pending`, or `All public states`.
- `Accepted only` is the default for guests and signed-in accounts without a saved preference.
- Signed-in accounts persist the preference to their profile. Guests may use the same control for the current browser only.
- The application-wide preference is the baseline for discovery lists, search, graph contents, related entries, child expansion, navigation badges, and child counts.
- Counts follow the effective preference: accepted counts only for `Accepted only`; accepted plus pending for `Accepted + pending`; accepted plus pending, rejected, and archived for `All public states`.
- `All public states` never bypasses privacy, ownership, group membership, tenant, or other authorization rules.

## Page-Level Overrides

- Pages with granular state filters retain `Accepted`, `Pending`, `Archived`, and `All states` as temporary, URL-scoped overrides.
- With no page override, the page uses the application-wide preference and says which default is active.
- A page override does not mutate the application-wide preference. `Use my default` removes the override.
- Direct authorized links to archived or rejected records remain available with their status notices even when discovery surfaces would hide them; discovery filtering is not authorization.

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
