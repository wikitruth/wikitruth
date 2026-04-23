#!/usr/bin/env bash
# Guardrail: prevent net-new explicit `any` / any-like usage in modern source.
#
# Fails if a diff against the base commit introduces additional any-like
# tokens anywhere under server/src or client/src. Existing occurrences are
# tracked separately by scripts/type-metrics.sh (the snapshot baseline).
#
# Net counter is used (additions minus deletions) so refactors that keep the
# same any-count or reduce it are accepted.
#
# Pattern is kept in sync with scripts/type-metrics.sh:
#   `\bas any\b|: any\b|<any>|\bany\[\]`
#
# Tests under tests/server are intentionally NOT scoped here: server-side
# test fixtures are still allowed to use `any` while the test toolchain
# remains CJS. Client tests ARE included because client/src is fully typed.

set -euo pipefail

resolve_base_commit() {
  if [[ -n "${GITHUB_BASE_REF:-}" ]] && git show-ref --verify --quiet "refs/remotes/origin/${GITHUB_BASE_REF}"; then
    git merge-base "origin/${GITHUB_BASE_REF}" HEAD
    return
  fi

  if git rev-parse --verify --quiet HEAD~1 >/dev/null; then
    git rev-parse HEAD~1
    return
  fi

  git hash-object -t tree /dev/null
}

BASE_COMMIT="$(resolve_base_commit)"

scopes=(server/src client/src)

ANY_PATTERN='\bas any\b|: any\b|<any>|\bany\[\]'

count_diff_signal() {
  local sign="$1"   # + or -
  git diff --unified=0 "${BASE_COMMIT}"..HEAD -- "${scopes[@]}" \
    | rg "^${sign}" \
    | rg -v '^[-+]{3}' \
    | rg -c "${ANY_PATTERN}" \
    || true
}

added_any="$(count_diff_signal '\+')"
removed_any="$(count_diff_signal '-')"

added_any="${added_any:-0}"
removed_any="${removed_any:-0}"

net_any=$((added_any - removed_any))

if (( net_any > 0 )); then
  echo "New explicit \`any\` / any-like usage detected in modern source (net +${net_any})."
  echo "Pattern: ${ANY_PATTERN}"
  echo "Add a precise type instead, or document the architectural blocker in the PR description."
  exit 1
fi

echo "No net new any-like usage detected in modern source."
