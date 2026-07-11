# Duplicate And Merge Policy

## Scope

Duplicate comparison is limited to entries of the same type and logical parent scope:

| Entry type | Duplicate scope |
| --- | --- |
| Topic | Same parent topic, or the same root category when no parent exists |
| Argument | Same owner type and owner ID |
| Question | Same owner type and owner ID |
| Answer | Same parent question |
| Issue | Same owner type and owner ID |
| Opinion/comment | Same owner and parent thread |
| Artifact | Same parent artifact, or the same topic/category when no parent artifact exists |

Private and public entries are never merged across visibility boundaries. Entries owned by different private groups or users are never compared.

## Deterministic Candidate Rules

Text normalization lowercases Unicode text, collapses whitespace, removes punctuation, and preserves letters and numbers. Candidate reasons are evaluated in this order:

1. `exact_title`: normalized titles are identical.
2. `exact_content`: non-empty normalized content hashes are identical.
3. `near_title`: title token Jaccard similarity is at least `0.86` and both titles contain at least three tokens.

The API returns the rule, score, and compared fields. Candidate detection never performs a merge automatically.

## Merge Decision

Only a screener, reviewer, or administrator may merge entries. The operator must provide a reason of at least ten characters and explicitly identify source and target.

The target survives. Before mutation, the service records snapshots of both entries. Child relationships and supported links move from source to target. Source-specific activity remains attributable to the source snapshot.

The source becomes a tombstone with:

- `mergedInto` target identity;
- merge date and operator;
- merge reason;
- screening state marking it unavailable for normal contribution.

A durable redirect resolves old source URLs to the target. Redirect chains are flattened to one terminal target, and cycles are rejected.

## Conflicts And Rollback

Merge is rejected when types differ, source equals target, either entry is already merged inconsistently, visibility boundaries differ, or target revision changed after the operator loaded the merge preview.

Rollback restores the captured snapshots and relationship mappings through the revision workflow. A rollback never deletes the merge audit event.

## Audit Requirements

Candidate decisions, merges, rejected merge attempts after authorization, and rollbacks produce privileged audit events containing source, target, operator, reason, moved relationship counts, and snapshot revision IDs. Secrets and private content are excluded from event payloads.

