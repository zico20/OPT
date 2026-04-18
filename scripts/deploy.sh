#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/deploy.sh [--web-only] [--worker-only]
# Uploads changed files and restarts the appropriate services on the VPS.

VPS="root@168.231.125.67"
REMOTE_ROOT="/opt/fire-risk/current"
LOCAL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

deploy_web=true
deploy_worker=true

for arg in "$@"; do
  case "$arg" in
    --web-only)    deploy_worker=false ;;
    --worker-only) deploy_web=false ;;
  esac
done

echo "==> Deploying to $VPS"

if [[ "$deploy_worker" == "true" ]]; then
  echo "--- Uploading worker files..."
  scp \
    "$LOCAL_ROOT/services/worker/src/runDaily.js" \
    "$LOCAL_ROOT/services/worker/src/earthEngine.js" \
    "$LOCAL_ROOT/services/worker/src/config.js" \
    "$LOCAL_ROOT/services/worker/src/firms.js" \
    "$LOCAL_ROOT/services/worker/src/server.js" \
    "$LOCAL_ROOT/services/worker/src/dataStore.js" \
    "$LOCAL_ROOT/services/worker/src/telegram.js" \
    "$LOCAL_ROOT/services/worker/src/alertRules.js" \
    "$VPS:$REMOTE_ROOT/services/worker/src/"

  echo "--- Restarting worker..."
  ssh "$VPS" "sudo systemctl restart fire-risk-worker && sudo systemctl status fire-risk-worker --no-pager -l"
fi

if [[ "$deploy_web" == "true" ]]; then
  echo "--- Uploading web files..."
  scp "$LOCAL_ROOT/apps/web/app/globals.css" \
    "$VPS:$REMOTE_ROOT/apps/web/app/"

  scp "$LOCAL_ROOT/apps/web/app/[lang]/page.js" \
    "$VPS:$REMOTE_ROOT/apps/web/app/[lang]/"

  echo "--- Building and restarting web..."
  ssh "$VPS" "cd $REMOTE_ROOT && ./scripts/prepare-production.sh && sudo systemctl restart fire-risk-web"
fi

echo "==> Deploy complete."
