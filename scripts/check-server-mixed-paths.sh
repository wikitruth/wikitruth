#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Checking for mixed import styles inside moved server/src modules..."

failed=0
while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  has_canonical=0
  has_legacy_escape=0

  if rg -q "['\"]server/src/" "$file"; then
    has_canonical=1
  fi
  if rg -q "['\"](\\.\\./){3,}(controllers|middlewares|models|services|types|utils|config)/" "$file"; then
    has_legacy_escape=1
  fi

  if [[ "$has_canonical" -eq 1 && "$has_legacy_escape" -eq 1 ]]; then
    echo "Mixed import styles detected in $file"
    failed=1
  fi
done < <(rg --files server/src | rg "\\.ts$")

if [[ "$failed" -ne 0 ]]; then
  exit 1
fi

echo "No mixed canonical/legacy import patterns detected."
