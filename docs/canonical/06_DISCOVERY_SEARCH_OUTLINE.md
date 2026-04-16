# Canonical Card: Discovery, Search, and Outline

## Purpose

Define how users discover and navigate knowledge graph content.

## Home/Explore Behavior

- Home API aggregates latest entries across core entity types.
- Response includes mixed-entry feed slices for quick discovery.
- If no topic exists yet, home redirects workflow toward install/bootstrap.

## Search Behavior

- Search supports multi-entity lookup over title/content/references fields.
- Search filters by:
- entity tab (`all`, `topics`, `arguments`, `questions`, `answers`, `artifacts`, `issues`, `opinions`)
- content scope (`all`, `wiki`, `diary`)
- optional cursor/limit pagination controls
- Private entry visibility in search depends on current user ownership.

## Outline Behavior

- Outline tree supports root listing and topic-subtree traversal.
- Outline search supports topic/argument title matching.
- Outline linking supports:
- topic-to-topic links via `TopicLink`
- topic/argument to argument links via `ArgumentLink`
- Link operations trigger children-count updates.

## Routing Surface (Modern Client)

- Modern app routes include dedicated pages for:
- discovery (`/`, `/explore`, `/search`)
- graph navigation (`/outline/link`, `/visualize`)
- entity-specific entry/list/create/edit flows

## Discovery Invariant

Discovery surfaces must remain moderation-aware and privacy-aware, so accepted/public content is the default public experience while private and pending views remain explicit.
