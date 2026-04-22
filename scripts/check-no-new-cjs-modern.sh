#!/usr/bin/env bash
# Guardrail: prevent net-new CommonJS `require(...)` usage in modern internal
# folders. Schema modules under server/src/models/schema/** are still on the
# legacy CJS factory pattern (loaded via `require()` from models.ts) and are
# excluded until they are migrated.
#
# Net counter is used (additions minus deletions) so refactors that remove
# require() calls (e.g. converting to typed `import` statements) are accepted.

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

modern_scopes=(
  'server/src/controllers'
  'server/src/middlewares'
  'server/src/services'
  'server/src/utils'
  'server/src/types'
  'client/src'
)

count_diff_signal() {
  local sign="$1"   # + or -
  local pattern="$2"
  git diff --unified=0 "${BASE_COMMIT}"..HEAD -- "${modern_scopes[@]}" \
    | rg "^${sign}" \
    | rg -v '^[-+]{3}' \
    | rg -c "${pattern}" \
    || true
}

# Match `require(` and `module.exports` only when introduced in modern folders.
added_require="$(count_diff_signal '\+' '\brequire\(')"
removed_require="$(count_diff_signal '-' '\brequire\(')"
added_modexp="$(count_diff_signal '\+' '\bmodule\.exports\b')"
removed_modexp="$(count_diff_signal '-' '\bmodule\.exports\b')"

added_require="${added_require:-0}"
removed_require="${removed_require:-0}"
added_modexp="${added_modexp:-0}"
removed_modexp="${removed_modexp:-0}"

net_require=$((added_require - removed_require))
net_modexp=$((added_modexp - removed_modexp))

failed=0
if (( net_require > 0 )); then
  echo "New require() usage detected in modern folders (net +${net_require})."
  echo "Use typed ESM-style import statements instead."
  failed=1
fi
if (( net_modexp > 0 )); then
  echo "New module.exports usage detected in modern folders (net +${net_modexp})."
  echo "Use typed ESM-style export statements instead."
  failed=1
fi

if (( failed == 1 )); then
  exit 1
fi

echo "No net new CommonJS usage detected in modern folders."
