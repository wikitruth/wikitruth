#!/usr/bin/env bash
set -euo pipefail

HTML_FILE="public/react-app.html"
SITEMAP_FILE="public/sitemap.xml"
ROBOTS_FILE="public/robots.txt"

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

if [[ -f "$SITEMAP_FILE" ]]; then
  echo "- [ok] sitemap exists: $SITEMAP_FILE"
else
  echo "- [missing] sitemap: $SITEMAP_FILE"
  status=1
fi

if [[ -f "$ROBOTS_FILE" ]]; then
  echo "- [ok] robots exists: $ROBOTS_FILE"
else
  echo "- [missing] robots: $ROBOTS_FILE"
  status=1
fi

exit $status
