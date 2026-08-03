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
- content scope (`all`, `wiki`, `journal`)
- optional cursor/limit pagination controls
- Private entry visibility in search depends on current user ownership.
- Graph-aware filters may constrain relationship, verdict, evidence health,
  freshness, and tenant context while preserving moderation and privacy rules.
- Unless a page-level state override is active, discovery lists, search results,
  graph contents, related entries, child expansion, navigation badges, and child
  counts use the reader's application-wide visibility preference.

## Outline Behavior

- Outline tree supports root listing and topic-subtree traversal.
- Outline search supports topic/argument title matching.
- Outline linking supports:
- topic-to-topic links via `TopicLink`
- topic/argument to argument links via `ArgumentLink`
- Link operations trigger children-count updates.
- Link mutations require contributor onboarding and, for API clients, `graph:write` scope.
- Link mutations validate visibility and relationship semantics and produce revision/audit evidence.

## Routing Surface (Modern Client)

- Modern app routes include dedicated pages for:
- discovery (`/`, `/explore`, `/search`)
- graph navigation (`/outline/link`, `/visualize`)
- entity-specific entry/list/create/edit flows

## Discovery Invariant

Discovery surfaces must remain moderation-aware and privacy-aware, so accepted/public content is the default public experience while private and pending views remain explicit.

## Search Engine Contract

- `/sitemap.xml` and `/robots.txt` are generated for the active request host and never publish the retired `/app` prefix.
- Root, core entry, and active civic-tenant URLs are included; private records are excluded.
- The initial HTML for public entry and civic detail routes contains record-specific title, description, canonical URL, OpenGraph metadata, and structured data before React loads.
- Public evidence bundles expose canonical entry data, claim relationships,
  artifact provenance, verdict policy/consensus/dissent, and revision identity
  without private content or secret audit payloads.
