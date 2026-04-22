#!/usr/bin/env bash
# Type debt metrics snapshot.
#
# Counts TypeScript suppressions and `any`-like occurrences across the
# server, client, and server-side test surfaces.
#
# Output is a key=value snapshot followed by per-directory breakdowns so it can
# be diffed across runs and persisted as a CI artifact / docs baseline.

set -euo pipefail

ROOT_SCOPES=(server/src client/src tests/server)

# Per-directory breakdown roots. Use shallower groupings for the server so
# hotspot areas (controllers, utils, models, ...) stay visible.
SERVER_SUBDIRS=(controllers middlewares models services utils types config)
CLIENT_SUBDIRS=(components pages context hooks services utils routes)

count_matches() {
  local pattern="$1"
  shift
  local scopes=("$@")
  if [ "${#scopes[@]}" -eq 0 ]; then
    echo 0
    return
  fi
  local existing=()
  for scope in "${scopes[@]}"; do
    if [ -d "$scope" ]; then
      existing+=("$scope")
    fi
  done
  if [ "${#existing[@]}" -eq 0 ]; then
    echo 0
    return
  fi
  { rg -n "$pattern" --glob '*.ts' --glob '*.tsx' "${existing[@]}" || true; } \
    | wc -l | tr -d ' '
}

count_files() {
  local scopes=("$@")
  local existing=()
  for scope in "${scopes[@]}"; do
    if [ -d "$scope" ]; then
      existing+=("$scope")
    fi
  done
  if [ "${#existing[@]}" -eq 0 ]; then
    echo 0
    return
  fi
  rg --files --glob '*.ts' --glob '*.tsx' "${existing[@]}" | wc -l | tr -d ' '
}

ANY_PATTERN='\bas any\b|: any\b|<any>|\bany\[\]'

timestamp="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
ts_files="$(count_files "${ROOT_SCOPES[@]}")"
ts_nocheck_total="$(count_matches '@ts-nocheck' "${ROOT_SCOPES[@]}")"
ts_ignore_total="$(count_matches '@ts-ignore' "${ROOT_SCOPES[@]}")"
ts_expect_error_total="$(count_matches '@ts-expect-error' "${ROOT_SCOPES[@]}")"
any_like_total="$(count_matches "$ANY_PATTERN" "${ROOT_SCOPES[@]}")"

echo "Type Metrics Snapshot (${timestamp})"
echo "ts_files=${ts_files}"
echo "ts_nocheck=${ts_nocheck_total}"
echo "ts_ignore=${ts_ignore_total}"
echo "ts_expect_error=${ts_expect_error_total}"
echo "any_like_occurrences=${any_like_total}"

print_scope_breakdown() {
  local label="$1"
  local root="$2"
  shift 2
  local subdirs=("$@")

  echo ""
  echo "${label}_totals:"
  echo "  ts_ignore=$(count_matches '@ts-ignore' "$root")"
  echo "  ts_expect_error=$(count_matches '@ts-expect-error' "$root")"
  echo "  ts_nocheck=$(count_matches '@ts-nocheck' "$root")"
  echo "  any_like=$(count_matches "$ANY_PATTERN" "$root")"

  echo "${label}_ts_ignore_by_directory:"
  for dir in "${subdirs[@]}"; do
    local target="${root}/${dir}"
    if [ -d "$target" ]; then
      echo "  ${dir}=$(count_matches '@ts-ignore' "$target")"
    fi
  done

  echo "${label}_any_like_by_directory:"
  for dir in "${subdirs[@]}"; do
    local target="${root}/${dir}"
    if [ -d "$target" ]; then
      echo "  ${dir}=$(count_matches "$ANY_PATTERN" "$target")"
    fi
  done
}

print_scope_breakdown "server" "server/src" "${SERVER_SUBDIRS[@]}"
print_scope_breakdown "client" "client/src" "${CLIENT_SUBDIRS[@]}"

echo ""
echo "tests_server_totals:"
echo "  ts_ignore=$(count_matches '@ts-ignore' tests/server)"
echo "  ts_expect_error=$(count_matches '@ts-expect-error' tests/server)"
echo "  any_like=$(count_matches "$ANY_PATTERN" tests/server)"
