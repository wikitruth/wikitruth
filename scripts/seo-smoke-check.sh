#!/usr/bin/env bash
set -euo pipefail

HTML_FILE="public/react-app.html"
SITEMAP_SERVICE="server/src/services/sitemapService.ts"
ROUTES_FILE="server/src/middlewares/routes.ts"

checks=(
  '<meta name="description"'
  '<meta property="og:title"'
  '<meta name="twitter:card"'
  'application/ld+json'
)

status=0

echo "SEO smoke check"
echo "- HTML: $HTML_FILE"
for pattern in "${checks[@]}"; do
  if rg -F -q "$pattern" "$HTML_FILE"; then
    echo "  [ok] $pattern"
  else
    echo "  [missing] $pattern"
    status=1
  fi
done

if rg -q "renderSitemap" "$SITEMAP_SERVICE" && rg -q "'/sitemap.xml'" "$ROUTES_FILE"; then
  echo "- [ok] host-aware sitemap route"
else
  echo "- [missing] host-aware sitemap route"
  status=1
fi

if rg -q "renderRobots" "$SITEMAP_SERVICE" && rg -q "'/robots.txt'" "$ROUTES_FILE"; then
  echo "- [ok] host-aware robots route"
else
  echo "- [missing] host-aware robots route"
  status=1
fi

if rg -q '/app/' "$SITEMAP_SERVICE"; then
  echo "- [invalid] stale /app sitemap path"
  status=1
else
  echo "- [ok] canonical root paths"
fi

exit $status
