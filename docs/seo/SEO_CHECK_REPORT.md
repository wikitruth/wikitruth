# SEO Check Report

## 2026-07-18 Modern Discovery Verification

- Initial shell metadata is route-aware for public Wikitruth entries and civic records.
- Canonical URLs are host-aware, query-free modern root paths.
- Sitemap and robots responses are generated for the active domain and exclude `/app` URLs and private records.
- `bash scripts/seo-smoke-check.sh` and `tests/server/react-shell-discovery.test.ts` pass.

Date: 2026-02-22

```text
SEO smoke check
- HTML: public/react-app.html
  [ok] <meta name="description"
  [ok] <meta property="og:title"
  [ok] <meta name="twitter:card"
  [ok] application/ld+json
- [ok] sitemap exists: public/sitemap.xml
- [ok] robots exists: public/robots.txt
```
