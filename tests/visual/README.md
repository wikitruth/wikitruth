# Critical Route Visual Regression

The committed images under `baselines/` are reviewed contracts for five
critical modern routes at desktop and mobile sizes. The test fixes time,
locale, timezone, motion, browser scale, identity, and API data so ordinary
local database changes do not alter the images.

The suite intentionally uses the server-rendered local application shell at
`https://127.0.0.1:9443`. Build the current code and ensure the local Wikitruth
process is running before invoking it. The raw webpack development template is
not a valid visual target because tenant metadata and shared styles are injected
by the server.

Run the comparison:

```bash
npm run test:visual:critical
```

When an intentional UI change requires new baselines:

1. Run `npm run test:visual:critical:update`.
2. Review every changed PNG at both widths; do not approve snapshots only
   because the update command passed.
3. Run `npm run test:visual:critical` without the update flag.
4. Commit the test, reviewed PNG files, and the UI change together.

Unexpected API requests fail the suite. Add explicit stable fixture data rather
than allowing visual tests to depend on the local or production database.

To use a different local address, set `VISUAL_BASE_URL`. Non-loopback targets
are rejected unless `ALLOW_REMOTE_VISUAL_BASELINE=true` is also set, which
requires explicit approval for that remote comparison.
