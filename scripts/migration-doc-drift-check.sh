#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DATE_UTC="$(date -u +%Y-%m-%d)"
REPORT_PATH="docs/frontend/MIGRATION_DRIFT_REPORT.md"

required_scripts=(
  "dev:server"
  "dev:client"
  "dev:all"
  "build:client"
  "test:client"
  "test:coverage"
  "test:e2e"
  "analyze:bundle"
)

missing_script_count=0

{
  echo "# Migration Doc-to-Repo Drift Report"
  echo
  echo "Date (UTC): ${DATE_UTC}"
  echo
  echo "## Script Contract Check"
  echo
  echo "| Script | package.json |"
  echo "|---|---|"
} > "$REPORT_PATH"

for script_name in "${required_scripts[@]}"; do
  if node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts['${script_name}'] ? 0 : 1);"; then
    echo "| \`npm run ${script_name}\` | ✅ present |" >> "$REPORT_PATH"
  else
    echo "| \`npm run ${script_name}\` | ❌ missing |" >> "$REPORT_PATH"
    missing_script_count=$((missing_script_count + 1))
  fi
done

{
  echo
  echo "## Result"
  echo
  if [[ "$missing_script_count" -eq 0 ]]; then
    echo "- Drift status: PASS"
    echo "- All required migration scripts are present."
  else
    echo "- Drift status: FAIL"
    echo "- Missing scripts: ${missing_script_count}"
  fi
} >> "$REPORT_PATH"

if [[ "$missing_script_count" -gt 0 ]]; then
  exit 1
fi
