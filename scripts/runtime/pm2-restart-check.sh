#!/usr/bin/env bash
set -euo pipefail

PROCESS_NAME="${1:-wikitruth}"
HEALTH_URL="${2:-http://127.0.0.1:8000/api/auth/me}"
MAX_WAIT_SECONDS="${3:-30}"
RUN_PREFLIGHT="${RUN_PREFLIGHT:-1}"
SUPPORTED_NODE_MAJORS="${SUPPORTED_NODE_MAJORS:-22,24}"
STRICT_NODE_MATRIX="${STRICT_NODE_MATRIX:-0}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

print_env_matrix() {
  local node_version npm_version pm2_version node_major
  node_version="$(node -p 'process.versions.node' 2>/dev/null || echo 'unknown')"
  npm_version="$(npm --version 2>/dev/null || echo 'unknown')"
  pm2_version="$(pm2 --version 2>/dev/null || echo 'unknown')"
  node_major="$(echo "${node_version}" | cut -d. -f1)"

  echo "Runtime matrix:"
  echo "  os=$(uname -s) arch=$(uname -m)"
  echo "  node=${node_version} npm=${npm_version} pm2=${pm2_version}"
  echo "  supported_node_majors=${SUPPORTED_NODE_MAJORS}"

  if [[ "${SUPPORTED_NODE_MAJORS}" != *"${node_major}"* ]]; then
    if [[ "${STRICT_NODE_MATRIX}" == "1" ]]; then
      echo "ERROR: node major ${node_major} is outside supported runtime matrix (${SUPPORTED_NODE_MAJORS})."
      exit 1
    fi
    echo "WARN: node major ${node_major} is outside supported runtime matrix (${SUPPORTED_NODE_MAJORS})."
  fi
}

if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 is not installed in PATH."
  exit 1
fi

print_env_matrix

if [[ "${RUN_PREFLIGHT}" == "1" ]]; then
  echo "Running runtime preflight before PM2 restart..."
  "${SCRIPT_DIR}/preflight-check.sh"
fi

pm2 describe "$PROCESS_NAME" >/dev/null 2>&1 || {
  echo "PM2 process not found: $PROCESS_NAME"
  exit 1
}

echo "Restarting PM2 process: $PROCESS_NAME"
pm2 restart "$PROCESS_NAME" --update-env >/dev/null

pm2 describe "$PROCESS_NAME" | sed -n '1,40p' >/tmp/pm2_describe_runtime_check.txt || true
if [ -f /tmp/pm2_describe_runtime_check.txt ]; then
  echo "PM2 process snapshot (first lines):"
  sed -n '1,10p' /tmp/pm2_describe_runtime_check.txt | sed 's/^/  /'
fi

status="unknown"
for _ in $(seq 1 "$MAX_WAIT_SECONDS"); do
  status="$(pm2 jlist | node -e 'const fs=require("fs"); const data=JSON.parse(fs.readFileSync(0,"utf8")); const name=process.argv[1]; const proc=data.find((entry)=>entry.name===name); process.stdout.write(proc?.pm2_env?.status || "missing");' "$PROCESS_NAME")"
  if [[ "$status" == "online" ]]; then
    break
  fi
  sleep 1
done

if [[ "$status" != "online" ]]; then
  echo "PM2 process is not online after restart: status=$status"
  exit 1
fi

http_code="000"
for _ in $(seq 1 "$MAX_WAIT_SECONDS"); do
  http_code="$(curl -k -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || true)"
  if [[ "$http_code" == "200" || "$http_code" == "401" || "$http_code" == "301" || "$http_code" == "302" || "$http_code" == "307" || "$http_code" == "308" ]]; then
    break
  fi
  sleep 1
done

if [[ "$http_code" != "200" && "$http_code" != "401" && "$http_code" != "301" && "$http_code" != "302" && "$http_code" != "307" && "$http_code" != "308" ]]; then
  echo "Runtime health check failed: $HEALTH_URL returned HTTP $http_code"
  exit 1
fi

echo "PM2 restart reliability check passed: process=$PROCESS_NAME status=$status health=$http_code"
