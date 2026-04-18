#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
cd "$ROOT"

matches="$(rg -n "legacy/compatibility" client server/src -S || true)"
if [[ -n "$matches" ]]; then
  echo "Modern code contains forbidden legacy compatibility references:"
  printf '%s\n' "$matches"
  exit 1
fi

echo "Modern compatibility-import guardrail passed."
