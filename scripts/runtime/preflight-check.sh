#!/usr/bin/env bash
# Runtime preflight: detect environment-level mismatches that have historically
# caused PM2 restart and dynamic-library load failures (T7-03).
#
# Checks:
#   1. Node major version is within the supported range declared in package.json
#      (engines.node).
#   2. npm version is reported (informational vs declared engines.npm).
#   3. bcrypt native module is loadable in the current node binary, surfacing
#      ABI / dylib mismatches before deploy.
#   4. (macOS only) brew dylibs the node binary links against are reachable.
#      Missing dylibs produce a warning rather than a hard failure.
#
# Exit codes:
#   0 - all checks passed (warnings allowed)
#   1 - blocking environment issue detected

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

failed=0

read_engines_field() {
  local field="$1"
  node -e "const pkg=require(process.argv[1]); process.stdout.write(((pkg.engines||{})[process.argv[2]])||'');" \
    "${ROOT_DIR}/package.json" "$field"
}

major_of() {
  echo "$1" | grep -oE '[0-9]+' | head -1
}

check_node_version() {
  local declared
  declared="$(read_engines_field node)"
  if [ -z "$declared" ]; then
    echo "INFO: package.json has no engines.node declaration; skipping node version check."
    return
  fi
  local current
  current="$(node -p 'process.versions.node')"
  echo "INFO: node engines requirement = ${declared} (current = ${current})"

  local current_major declared_min declared_max_excl
  current_major="$(echo "$current" | cut -d. -f1)"
  declared_min="$(echo "$declared" | grep -oE '>=\s*[0-9]+' | head -1 | grep -oE '[0-9]+' || true)"
  declared_max_excl="$(echo "$declared" | grep -oE '<\s*[0-9]+' | head -1 | grep -oE '[0-9]+' || true)"

  if [ -n "$declared_min" ] && [ "$current_major" -lt "$declared_min" ]; then
    echo "ERROR: node ${current} below required minimum major ${declared_min} (declared range: ${declared})"
    failed=1
  fi
  if [ -n "$declared_max_excl" ] && [ "$current_major" -ge "$declared_max_excl" ]; then
    echo "WARN: node ${current} is at or above declared upper bound (<${declared_max_excl})."
    echo "      This is allowed but native modules (e.g. bcrypt) may not yet support this Node major."
  fi
}

check_npm_version() {
  local declared
  declared="$(read_engines_field npm)"
  if [ -z "$declared" ]; then
    echo "INFO: package.json has no engines.npm declaration; skipping npm version check."
    return
  fi
  local current
  current="$(npm --version 2>/dev/null || echo '')"
  if [ -z "$current" ]; then
    echo "WARN: npm not found on PATH; skipping npm version check."
    return
  fi
  echo "INFO: npm engines requirement = ${declared} (current = ${current})"
}

check_bcrypt_loadable() {
  if [ ! -d "${ROOT_DIR}/node_modules/bcrypt" ]; then
    echo "INFO: bcrypt not installed; skipping native module check."
    return
  fi
  if ! ( cd "${ROOT_DIR}" && node -e "require('bcrypt');" ) >/dev/null 2>&1; then
    echo "ERROR: bcrypt failed to load in the current node binary."
    echo "       This often indicates a node ABI / dylib mismatch."
    echo "       Try: npm rebuild bcrypt --update-binary"
    failed=1
  else
    echo "INFO: bcrypt loaded successfully."
  fi
}

check_brew_dylibs_macos() {
  if [ "$(uname -s)" != "Darwin" ]; then
    return
  fi
  if ! command -v otool >/dev/null 2>&1; then
    return
  fi
  local node_bin
  node_bin="$(command -v node || true)"
  if [ -z "$node_bin" ]; then
    return
  fi
  local missing
  missing="$(otool -L "$node_bin" 2>/dev/null \
    | awk 'NR>1 {print $1}' \
    | grep -E '^(/opt/homebrew|/usr/local/Cellar)/' \
    | while IFS= read -r lib; do
        [ -e "$lib" ] || echo "$lib"
      done)"
  if [ -n "$missing" ]; then
    echo "WARN: node binary depends on missing brew dylibs:"
    echo "$missing" | sed 's/^/  /'
    echo "      Reinstall affected formula via: brew reinstall <formula>"
  fi
}

echo "Runtime preflight checks"
echo "------------------------"
check_node_version
check_npm_version
check_bcrypt_loadable
check_brew_dylibs_macos
echo "------------------------"

if [ "$failed" -ne 0 ]; then
  echo "Runtime preflight FAILED."
  exit 1
fi

echo "Runtime preflight OK."
