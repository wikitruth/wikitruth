#!/usr/bin/env bash
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

added_nocheck_lines="$(
  git diff --unified=0 "${BASE_COMMIT}"..HEAD -- '*.ts' \
    | rg '^\+.*@ts-nocheck' \
    | rg -v '^\+\+\+' \
    || true
)"

if [[ -n "${added_nocheck_lines}" ]]; then
  echo "New @ts-nocheck lines are not allowed."
  echo "${added_nocheck_lines}"
  exit 1
fi

echo "No new @ts-nocheck additions detected."
