#!/usr/bin/env bash
# Load scripts/demo.local.env (if present) into the environment, then exec the given command.
# Usage: ./scripts/with-demo-env.sh npm run db:seed
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${STREAMMEO_DEMO_ENV:-$ROOT/scripts/demo.local.env}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi
cd "$ROOT"
exec "$@"
