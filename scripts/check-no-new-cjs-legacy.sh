#!/usr/bin/env bash
# Guardrail: prevent net-new CommonJS `require(...)` / `module.exports`
# additions inside the legacy runtime tier while it is being optimized
# under docs/plans/LEGACY_CODE_HEALTH_OPTIMIZATION_CHECKLIST_PLAN_2026-04-24.md.
#
# Static-asset bundles (legacy/static/**), template files
# (legacy/templates/**), and the historical grunt build (legacy/build/**)
# are excluded from the gate because they predate this plan and are not
# part of the runtime CJS surface this guardrail is locking down.
#
# Like the modern guardrail, a net counter is used (additions minus
# deletions) so refactors that remove CJS calls are accepted.

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

legacy_scopes=(
  'legacy/server/controllers'
  'legacy/server/utils'
  'legacy/server/models'
  'legacy/server/config'
  'legacy/compatibility/server'
)

count_diff_signal() {
  local sign="$1"   # + or -
  local pattern="$2"
  git diff --unified=0 "${BASE_COMMIT}"..HEAD -- "${legacy_scopes[@]}" \
    | rg "^${sign}" \
    | rg -v '^[-+]{3}' \
    | rg -c "${pattern}" \
    || true
}

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
  echo "New require() usage detected in legacy runtime folders (net +${net_require})."
  echo "Convert to typed import statements or extend the modern surface instead."
  failed=1
fi
if (( net_modexp > 0 )); then
  echo "New module.exports usage detected in legacy runtime folders (net +${net_modexp})."
  echo "Convert to typed export statements or extend the modern surface instead."
  failed=1
fi

if (( failed == 1 )); then
  exit 1
fi

echo "No net new CommonJS usage detected in legacy runtime folders."
