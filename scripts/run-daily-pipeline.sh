#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${FIRE_RISK_REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
RUN_DATE="${1:-}"
FORCE_REAL_MODE="${WORKER_PIPELINE_FORCE_REAL:-true}"
PIPELINE_ASSET_POLICY="${WORKER_PIPELINE_ASSET_DATE_POLICY:-exact}"

cd "$REPO_ROOT"

if [[ "$FORCE_REAL_MODE" == "true" ]]; then
  export WORKER_USE_MOCK_EE=false
fi

# Force exact-date ingestion after export so daily runs never fallback to stale assets.
export EE_ASSET_DATE_POLICY="$PIPELINE_ASSET_POLICY"

if [[ -n "$RUN_DATE" ]]; then
  bash "$REPO_ROOT/scripts/run-daily-export.sh" "$RUN_DATE"
  exec bash "$REPO_ROOT/scripts/run-daily-worker.sh" "$RUN_DATE"
fi

bash "$REPO_ROOT/scripts/run-daily-export.sh"
exec bash "$REPO_ROOT/scripts/run-daily-worker.sh"
