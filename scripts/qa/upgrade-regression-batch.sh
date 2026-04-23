#!/usr/bin/env bash
set -euo pipefail

BATCH="${1:-all}"

run() {
  echo ">>> $*"
  "$@"
}

run_base_suite() {
  run npm run -s ci:smoke
  run npm run -s test:server
  run npm run -s test:client
}

run_batch_suite() {
  case "$1" in
    tooling)
      run_base_suite
      run npm run -s lint
      run npm run -s type:check
      ;;
    test-runner)
      run_base_suite
      run npm run -s test:parity:server
      run npm run -s test:parity:client
      ;;
    lint-stack)
      run_base_suite
      run npm run -s lint
      run npm run -s lint:server-paths
      run npm run -s lint:compat:isolation
      run npm run -s lint:compat:imports
      ;;
    react-stack)
      run_base_suite
      run npm run -s test:e2e
      ;;
    server-core)
      run_base_suite
      run npm run -s runtime:preflight
      run npm run -s build:server
      ;;
    native-modules)
      run npm run -s runtime:preflight
      run npm run -s test:server -- tests/server/session-csrf-policy.test.js tests/server/auth-social-session-callbacks.test.ts --runInBand
      ;;
    all)
      run_batch_suite tooling
      run_batch_suite test-runner
      run_batch_suite lint-stack
      run_batch_suite react-stack
      run_batch_suite server-core
      run_batch_suite native-modules
      ;;
    *)
      echo "Unknown batch: $1"
      echo "Supported: tooling | test-runner | lint-stack | react-stack | server-core | native-modules | all"
      exit 1
      ;;
  esac
}

run_batch_suite "$BATCH"
echo "Upgrade regression batch '$BATCH' completed."
