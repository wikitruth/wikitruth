#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Checking server/src imports for legacy root-path regressions..."

# Any backend import that climbs three or more parent segments from server/src
# is likely escaping canonical server/src module boundaries.
violations="$(rg -n --glob 'server/src/**/*.ts' "(from|require\\()\\s*['\"](\\.\\./){3,}(controllers|middlewares|models|services|types|utils|config)/" || true)"

if [[ -n "$violations" ]]; then
  echo "Found imports that escape server/src canonical boundaries:"
  echo "$violations"
  exit 1
fi

echo "No legacy root-path imports detected in server/src."
