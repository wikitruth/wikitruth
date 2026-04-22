#!/usr/bin/env bash
# Guardrail: prevent net-new TypeScript suppression debt from landing.
#
# Fails if a diff against the base commit introduces additional @ts-ignore
# or @ts-expect-error lines anywhere under server/src, client/src, or
# tests/server. Existing suppressions are tracked separately by
# scripts/type-metrics.sh.
#
# Net counter is used (additions minus deletions) so refactors that keep
# the same suppression count or reduce it are accepted.

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

scopes=(server/src client/src tests/server)

count_diff_signal() {
  local sign="$1"   # + or -
  local pattern="$2"
  git diff --unified=0 "${BASE_COMMIT}"..HEAD -- "${scopes[@]}" \
    | rg "^${sign}" \
    | rg -v '^[-+]{3}' \
    | rg -c "${pattern}" \
    || true
}

added_ignore="$(count_diff_signal '\+' '@ts-ignore')"
removed_ignore="$(count_diff_signal '-' '@ts-ignore')"
added_expect="$(count_diff_signal '\+' '@ts-expect-error')"
removed_expect="$(count_diff_signal '-' '@ts-expect-error')"

added_ignore="${added_ignore:-0}"
removed_ignore="${removed_ignore:-0}"
added_expect="${added_expect:-0}"
removed_expect="${removed_expect:-0}"

net_ignore=$((added_ignore - removed_ignore))
net_expect=$((added_expect - removed_expect))

failed=0
if (( net_ignore > 0 )); then
  echo "New @ts-ignore additions detected (net +${net_ignore})."
  failed=1
fi
if (( net_expect > 0 )); then
  echo "New @ts-expect-error additions detected (net +${net_expect})."
  echo "If justified, justify in PR description and update the type-debt baseline."
  failed=1
fi

if (( failed == 1 )); then
  exit 1
fi

echo "No net new TypeScript suppressions detected."
