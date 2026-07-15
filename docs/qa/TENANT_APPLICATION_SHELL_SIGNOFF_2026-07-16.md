# Tenant Application Shell Signoff (2026-07-16)

## Result

The modern shared application now preserves the host-level application boundary
demonstrated by the live legacy/shared instance. Wikitruth remains the default
knowledge application, while FixPH loads as a distinct tenant application with
its own document identity, logo, shell theme, navigation, home structure,
sections, app destinations, and Philippine-scoped knowledge context.

The implementation remains one shared Wikitruth runtime. No separate FixPH
codebase or production process was introduced.

## Read-Only Comparison Baseline

The following live pages were inspected without changing production:

- `https://wikitruth.net/` uses the Wikitruth title, logo, global knowledge hero,
  default sections, latest content, and global category sidebar.
- `https://fixthephilippines.org/` uses the FixPH title, favicon,
  `app-fixtheph` body class, Philippine hero, tenant section links, scoped latest
  content, and Philippine category sidebar.

The modern implementation now carries the same application boundary through a
generic tenant contract rather than hardcoded page forks.

## Implemented Contract

- Civic tenants persist site identity, Home/About/Explore destinations, and an
  optional Wikitruth knowledge-root topic.
- Older persisted FixPH records inherit built-in defaults safely.
- The public application-context endpoint exposes presentation fields only and
  rejects conflicting host/tenant context.
- Home feed families and sidebar categories scope to the tenant knowledge root.
- Header, sidebar, footer, page metadata, and Home share one React application
  context.
- The server-rendered HTML shell emits the correct title, canonical URL,
  OpenGraph identity, favicon set, manifest, theme color, structured site name,
  body class, and application id before React starts.
- Local `/civic` and `?civic=1` routes remain same-origin and never redirect QA
  into the live FixPH domain.

## Local Runtime Evidence

- Local PM2 process `35` (`wikitruth`) was rebuilt and restarted only on this
  workstation; it remained `online` after restart.
- Default HTML emitted the Wikitruth document title with no tenant body class.
- A FixPH host-header request emitted the FixPH title, favicon, canonical host,
  `wt-tenant-app app-fixtheph`, and `data-application="fixtheph"`.
- Local `/civic` emitted FixPH identity before the React bundle loaded.
- Local FixPH application context used Home/About/Explore `/civic`, knowledge
  root `5923af159c799b16ae951962`, and category `ph subtopic`.
- The scoped Home response contained 1 topic, 3 facts, 1 question, 2 artifacts,
  1 issue, and 1 opinion, with no global category leakage.

## Browser Evidence

Chrome verification covered desktop `1920x828` and mobile `390x844` layouts.

- Wikitruth rendered its own logo, hero, three patterned feature cards, global
  app/category sidebar, latest posts, and no tenant body class.
- FixPH rendered its own logo and `FixPH` nav title, civic hero, seven enabled
  sections, local civic records, Philippine category, shell colors, and tenant
  body class.
- FixPH Search navigated to `/search?civic=1` and retained FixPH title, shell,
  and body class.
- Projects navigated to `/civic/projects` and retained the FixPH shell.
- Switching to Wikitruth returned to `/`, removed tenant classes, and restored
  the Wikitruth hero; switching back restored FixPH at `/civic`.
- Both mobile layouts had equal document client/scroll widths and no horizontal
  page overflow. FixPH's section strip remained intentionally horizontally
  scrollable.
- The mobile More menu stayed within the viewport, and the app switcher opened
  as a correctly bounded off-canvas sidebar.
- No framework error overlay or application-owned console error appeared. The
  observed warnings were emitted by a Chrome extension's content script.

## Automated Verification

- Focused tenant server tests: passed.
- Focused application-shell client tests: passed.
- Full server suite, serial confirmation: 61 suites, 272 tests passed.
- Full client suite: 85 suites, 208 tests passed.
- `npm run ci:smoke`: passed, including lint, modern and legacy type checks,
  suppression/CommonJS guardrails, and source-file budget checks.
- `npm run build`: passed for production server and client bundles.

One parallel full-suite attempt timed out in an unrelated legacy contributors
smoke test. That test passed in 0.6 seconds in isolation, and the complete serial
server suite subsequently passed; no product defect was reproduced.

## Safety Boundary

No production/VPS checkout, dependency, process, proxy, listener, or DNS change
was made. The live domains were used only as read-only comparison references.
