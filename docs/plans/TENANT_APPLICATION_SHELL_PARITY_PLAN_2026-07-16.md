# Tenant Application Shell Parity Plan

Date: 2026-07-16  
Status: In progress

## Objective

Restore the legacy host-level application boundary in the modern client so a
tenant such as FixPH behaves like an independently branded application while
sharing the Wikitruth runtime, identity, entry models, and APIs.

The modern implementation may improve the tenant's information architecture,
but loading a tenant domain must not look or behave like a generic Wikitruth
page with a tenant workspace embedded inside it.

## Comparison Baseline

The current live shared instance demonstrates these legacy behaviors:

| Surface | `wikitruth.net` | `fixthephilippines.org` |
| --- | --- | --- |
| Document identity | Wikitruth title and favicon | FixPH title, favicon, and `app-fixtheph` body class |
| Header | Wikitruth logo/name and knowledge links | FixPH logo/name and FixPH section links |
| Home hero | The Wikitruth Project | Let's Fix The Philippines |
| Home structure | Truth, worldviews, and morality feature cards | People, incidents, projects, organizations, and election cards |
| Latest content | Global Wikitruth knowledge | Entries scoped to the Philippine application root |
| Sidebar taxonomy | Global knowledge categories | Philippine application categories |
| App switcher | Wikitruth plus Fix The Philippines | Same app list, with host-specific destinations |

The modern client already resolves a tenant by host and has the richer
seven-section Civic Core. The comparison identified these remaining gaps:

- Persisted civic tenants do not retain an application-site contract or legacy
  knowledge root, so host-scoped Home/Explore data falls back to global data.
- The React document shell hardcodes Wikitruth title, metadata, favicon, theme,
  Home link, About link, and footer behavior.
- Header and sidebar fetch application state independently and local `/civic`
  cannot opt into the FixPH shell without using the production domain.
- Tenant colors currently stop at the Civic workspace instead of applying to
  the surrounding application shell.

## Implementation Checklist

### Tenant Contract And Server Resolution

- [x] Add a validated tenant site contract for home identity, navigation
  destinations, and the optional Wikitruth knowledge-root topic.
- [x] Preserve built-in defaults when an older persisted tenant lacks newer
  site fields.
- [x] Migrate the original FixPH home title, description, and Philippine root
  topic into the built-in tenant configuration.
- [x] Restore application-scoped Home/Explore queries and sidebar categories.
- [x] Add a lightweight public application-context API for host domains and the
  local same-origin Civic workspace.
- [x] Reject conflicting tenant/host context and expose only public tenant
  presentation fields.

### Modern Application Shell

- [x] Load application context once and share it across header, sidebar, footer,
  metadata, and page content.
- [x] Use tenant logo, navigation title, home/about/explore destinations, and
  enabled sections throughout the global shell.
- [x] Apply a stable tenant body class and safe CSS color/font variables.
- [x] Update document title, description, OpenGraph identity, favicon, manifest,
  theme color, and structured website name for the active tenant.
- [x] Keep Wikitruth as the default shell when no tenant host or local Civic
  context is active.
- [x] Keep local FixPH navigation same-origin and never redirect local QA to the
  live production domain.

### Verification

- [ ] Add server tests for tenant defaults, host resolution, context conflicts,
  public serialization, and scoped home queries.
- [ ] Add client tests for tenant header, footer, metadata, body theme, local
  Civic context, app switching, and default Wikitruth fallback.
- [ ] Verify Wikitruth and FixPH at desktop and mobile widths with no framework
  overlay, relevant console error, clipped navigation, or document overflow.
- [ ] Exercise tenant Home, Explore, one tenant section, app switching, and the
  local `/civic` path.
- [ ] Run focused tests, full server/client regressions, smoke guardrails, and
  production builds.
- [ ] Record final evidence and move this plan only after a separate verification
  pass succeeds with no pending or deferred items.

## Delivery Boundaries

- No production, VPS, proxy, DNS, or remote process changes are authorized by
  this plan.
- The live domains are read-only references.
- Existing Civic Core sections and tenant isolation remain authoritative; this
  work restores the missing application-shell boundary rather than reintroducing
  a separate FixPH codebase.
- Legacy renderer retirement and React Native remain explicitly deferred.
