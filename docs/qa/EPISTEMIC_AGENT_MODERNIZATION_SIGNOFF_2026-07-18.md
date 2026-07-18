# Epistemic and Agent Modernization Signoff

Date: 2026-07-18

## Decision

The planned epistemic-kernel, administrator final-say, scoped agent API, generic
civic extension, public-discovery, realtime, and local performance work is
implemented and verified. This is a local engineering signoff, not a production
deployment or a claim that synthetic pilot content is true.

## Implemented Behavior

- Reviewer consensus is the normal decision path, computed independently for
  factual and ethical channels under versioned policy `2026-07-v2`.
- Selected platform administrators can make a final decision only through an
  explicit acknowledged override with reasoning, evidence, actor attribution,
  the available consensus snapshot, an immutable revision, and privileged audit
  event. Reversing an override creates another decision rather than rewriting
  history.
- Software agents use one-time, hashed, scoped, expiring, revocable,
  rate-limited bearer credentials tied to an active accountable user. Their
  seven standard entry contributions start pending and retain normal onboarding,
  duplicate, screening, graph, civic-tenant, and moderation gates.
- FixPH and future country applications resolve configuration, host identity,
  navigation, geography, localization, extension schemas, authorization, and
  civic data through tenant context rather than country-specific model forks.
- `/api/v1` is the stable integration contract; `/api` remains a compatibility
  alias and every mounted operation is represented by generated OpenAPI.

## Verification Matrix

| Surface | Final evidence |
| --- | --- |
| Server | 71 suites, 313 tests passed |
| Client | 90 suites, 223 tests passed |
| Static quality | ESLint, modern and legacy TypeScript, suppression/`any`/CommonJS/file-size/import guardrails passed |
| Build/runtime | Server and production client builds passed; local PM2 `wikitruth` restarted and loopback health returned 200 |
| API contract | 232 mounted operations covered; API-version and agent-safe error contracts passed |
| Accessibility/discovery | Automated accessibility, visible-focus, metadata, canonical, structured-data, sitemap, and robots checks passed |
| Performance budgets | Auth, topics, and search p95/RPS budgets passed |
| Concurrent load | 281/281 API requests and 100/100 Mongo reads succeeded; p95 485.69 ms and 254.31 ms; zero errors |
| Epistemic pilot | 3-of-3 factual and ethical consensus, source reviews, issue resolution, override/reversal, signal, appeal, civic evidence link, and cleanup passed |
| Audit integrity | Final pilot verified 143 chained privileged events with zero legacy or broken events |
| Public Chrome | 14 route/viewport checks passed across desktop and 390px mobile with visible focus, no overflow, and no application console errors |
| Authenticated parity | Seven entry families and reader/contributor/screener/reviewer/admin role presentation passed |
| Agent Chrome | Credential create, one-time token, bearer identity, rotation invalidation, mobile layout, revocation, and cleanup passed |
| Civic Chrome | Platform/tenant admin, membership, jurisdiction, record, lifecycle, evidence link, mobile layout, and cleanup passed |

Machine-readable evidence:

- `docs/qa/EPISTEMIC_FLAGSHIP_PILOT_REPORT_2026-07-18.json`
- `docs/performance/API_DATABASE_LOAD_REPORT_2026-07-18.json`
- `docs/qa/artifacts/public-modern-browser-2026-07-18/manifest.json`
- `docs/qa/artifacts/agent-browser-disposable-2026-07-18/manifest.json`
- `docs/qa/artifacts/civic-browser-disposable-2026-07-18/manifest.json`
- `docs/qa/artifacts/parity-authenticated-disposable-2026-07-18/manifest.json`

## Residual Operating Work

The code-complete status does not fabricate real-world adoption. The current
local content-policy sample still reports two exact-title duplicate candidate
groups, no rich provenance or source-quality review on its three sampled legacy
artifacts, and five accepted critical issues awaiting resolution. Those are
content curation and reviewer-operation tasks; the disposable flagship pilot
proves that the implemented workflow can process them.

Chrome on loopback also reports external script certificate-fetch warnings with
no application URL. The browser harness records these as environment warnings
and continues to fail on application console or page errors. The test shell runs
Node 25 outside the declared `<25` range, while the verified local PM2 process
runs supported Node 24. No production/VPS, DNS, proxy, or remote process was
changed.
