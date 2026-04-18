#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
cd "$ROOT"

prohibited_paths=(
  "public/templates"
  "public/views"
  "public/layouts"
  "public/js"
  "public/css"
  "public/less"
  "public/components"
  "public/fonts"
  "tasks"
  "Gruntfile.js"
  "bower.json"
  ".bowerrc"
  ".jshintrc"
  ".jshintrc-client"
  ".jshintrc-server"
  ".babelrc"
)

violations=()
for p in "${prohibited_paths[@]}"; do
  if [[ -e "$p" ]]; then
    violations+=("$p")
  fi
done

if (( ${#violations[@]} > 0 )); then
  echo "Legacy-isolation violations found (outside legacy/):"
  printf ' - %s\n' "${violations[@]}"
  exit 1
fi

echo "Legacy isolation check passed."
