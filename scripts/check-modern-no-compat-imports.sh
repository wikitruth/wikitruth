#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
cd "$ROOT"

# Approved compatibility seams in modern runtime.
allowed_files=(
  "server/src/app.ts"
  "server/src/middlewares/routes.ts"
  "server/src/config/config.js"
  "server/src/config/development.json"
)

for f in server/src/controllers/*.ts; do
  [[ -f "$f" ]] && allowed_files+=("$f")
done
for f in server/src/controllers/async/*.ts; do
  [[ -f "$f" ]] && allowed_files+=("$f")
done

tmp_allow="$(mktemp)"
trap 'rm -f "$tmp_allow"' EXIT
printf '%s\n' "${allowed_files[@]}" > "$tmp_allow"

matches="$(rg -n "legacy/compatibility" client server/src -S || true)"
if [[ -z "$matches" ]]; then
  echo "Modern compatibility-import guardrail passed."
  exit 0
fi

violations=()
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  file="${line%%:*}"
  if ! grep -Fxq "$file" "$tmp_allow"; then
    violations+=("$line")
  fi
done <<< "$matches"

if (( ${#violations[@]} > 0 )); then
  echo "Modern code contains non-approved compatibility references:"
  printf '%s\n' "${violations[@]}"
  exit 1
fi

echo "Modern compatibility-import guardrail passed."
