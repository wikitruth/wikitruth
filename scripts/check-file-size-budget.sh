#!/usr/bin/env bash
# Guardrail: prevent NEW oversized TypeScript modules from landing.
#
# Policy: any *.ts/.tsx file in server/src or client/src that exceeds the
# configured BUDGET (lines) and was not already over-budget on the base
# revision (default: origin/develop, falls back to HEAD~1) fails the check.
#
# Pre-existing oversized files (e.g. server/src/utils/flowUtils.ts) are
# allow-listed in CURRENT_BUDGET_EXEMPTIONS and tracked separately under
# Track 4 of docs/plans/CODE_HEALTH_OPTIMIZATION_CHECKLIST_PLAN_2026-04-22.md.
#
# Usage:
#   scripts/check-file-size-budget.sh           # default: 500 lines
#   BUDGET=400 scripts/check-file-size-budget.sh
#   BASE_REF=main scripts/check-file-size-budget.sh

set -euo pipefail

BUDGET="${BUDGET:-500}"
BASE_REF="${BASE_REF:-}"

if [[ -z "$BASE_REF" ]]; then
  if git rev-parse --verify --quiet origin/develop >/dev/null; then
    BASE_REF="origin/develop"
  else
    BASE_REF="HEAD~1"
  fi
fi

# Files that were already over-budget when this guardrail was introduced.
# Decompose them under Track 4 — do not add new entries lightly.
CURRENT_BUDGET_EXEMPTIONS=(
  "server/src/utils/flowUtils.ts"
  "server/src/controllers/api/auth.ts"
  "server/src/controllers/api/moderation.ts"
  "server/src/controllers/api/admin.ts"
  "server/src/controllers/api/members.ts"
  "client/src/pages/VisualizePage.tsx"
  "client/src/services/api.ts"
  "client/src/components/Entry/EntryQuickActions.tsx"
  "client/src/pages/Admin/Verdicts/VerdictsPage.tsx"
)

is_exempt() {
  local f="$1"
  for e in "${CURRENT_BUDGET_EXEMPTIONS[@]}"; do
    if [[ "$f" == "$e" ]]; then return 0; fi
  done
  return 1
}

violations=0
while IFS= read -r -d '' file; do
  rel="${file#./}"
  case "$rel" in
    server/src/*|client/src/*) ;;
    *) continue ;;
  esac

  lines=$(wc -l <"$file" | tr -d ' ')
  if (( lines <= BUDGET )); then continue; fi

  if is_exempt "$rel"; then continue; fi

  # Was the file already over-budget on the base ref? If so, don't fail PRs
  # that didn't worsen it (we still report it as a warning).
  base_lines=0
  if git cat-file -e "${BASE_REF}:${rel}" 2>/dev/null; then
    base_lines=$(git show "${BASE_REF}:${rel}" 2>/dev/null | wc -l | tr -d ' ')
  fi

  if (( base_lines > BUDGET )); then
    echo "warn: ${rel} ${lines} lines (already > ${BUDGET} on ${BASE_REF}; was ${base_lines})" >&2
    continue
  fi

  echo "error: ${rel} ${lines} lines exceeds budget ${BUDGET}" >&2
  violations=$((violations + 1))
done < <(find server/src client/src \( -name "*.ts" -o -name "*.tsx" \) -type f -print0 2>/dev/null)

if (( violations > 0 )); then
  echo "" >&2
  echo "${violations} new oversized file(s) detected (budget=${BUDGET} lines)." >&2
  echo "Decompose into smaller modules or update CURRENT_BUDGET_EXEMPTIONS only with reviewer approval." >&2
  exit 1
fi

echo "file-size budget OK (budget=${BUDGET} lines)"
