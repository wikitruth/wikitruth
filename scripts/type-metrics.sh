#!/usr/bin/env bash
set -euo pipefail

SCOPES=(controllers middlewares models services utils types tests/server)

count_files() {
  rg --files --glob '*.ts' "${SCOPES[@]}" | wc -l | tr -d ' '
}

count_matches() {
  local pattern="$1"
  { rg -n "$pattern" --glob '*.ts' "${SCOPES[@]}" || true; } | wc -l | tr -d ' '
}

timestamp="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
ts_files="$(count_files)"
ts_nocheck="$(count_matches '@ts-nocheck')"
ts_ignore="$(count_matches '@ts-ignore')"
ts_expect_error="$(count_matches '@ts-expect-error')"
any_like="$(count_matches 'as any|: any\\b|\\bany\\b')"

echo "Type Metrics Snapshot (${timestamp})"
echo "ts_files=${ts_files}"
echo "ts_nocheck=${ts_nocheck}"
echo "ts_ignore=${ts_ignore}"
echo "ts_expect_error=${ts_expect_error}"
echo "any_like_occurrences=${any_like}"
echo ""
echo "ts_nocheck_by_directory:"
for dir in controllers middlewares models services utils types tests/server; do
  dir_count="$({ rg -n '@ts-nocheck' --glob '*.ts' "$dir" || true; } | wc -l | tr -d ' ')"
  echo "${dir}=${dir_count}"
done
