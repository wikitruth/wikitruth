# API and Database Load Test Report

Date: 2026-07-18

## Scope

The repeatable read-only harness exercised the local PM2 Wikitruth runtime and
the same local Mongo database concurrently. It used stable `/api/v1` requests,
ten distinct synthetic clients, and a sustainable three requests/second per
client so the test measured application latency rather than intentionally
triggering the per-client rate limiter. One unmeasured read per API route and
database collection warms connection pools and local caches before measurement.

```bash
WT_LOAD_BASE_URL=https://127.0.0.1:9443 \
WT_LOAD_DURATION_SECONDS=10 \
WT_LOAD_CONCURRENCY=10 \
WT_LOAD_DB_ITERATIONS=100 \
npm run test:load:api-db
```

## Results

| Surface | Successful | Failed | p50 | p95 | p99 | Maximum |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| API | 300 | 0 | 83.33 ms | 180.65 ms | 206.58 ms | 235.95 ms |
| Mongo reads | 100 | 0 | 9.54 ms | 43.79 ms | 133.55 ms | 204.75 ms |

All API responses were HTTP 200. API p95 remained below 1,500 ms, database p95
below 500 ms, and both error rates below 1%. The run passed every configured
threshold. Full machine-readable evidence is in
`docs/performance/API_DATABASE_LOAD_REPORT_2026-07-18.json`.

The harness covers `/api/v1/home`, `/api/v1/topics?limit=20`, and
`/api/v1/civic/overview`, plus representative recent-entry reads across topics,
arguments, artifacts, and civic records. It is a local engineering baseline,
not a production capacity claim.
