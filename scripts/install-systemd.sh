#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${FIRE_RISK_REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
SYSTEMD_DIR="/etc/systemd/system"
SERVICE_USER="${SUDO_USER:-${USER:-$(id -un)}}"
SERVICE_GROUP="$(id -gn "$SERVICE_USER")"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT

render_unit() {
  local src="$1"
  local dest="$2"
  sed \
    -e "s|__SERVICE_USER__|$SERVICE_USER|g" \
    -e "s|__SERVICE_GROUP__|$SERVICE_GROUP|g" \
    -e "s|__REPO_ROOT__|$REPO_ROOT|g" \
    "$src" > "$dest"
}

echo "Installing systemd unit files..."
chmod +x "$REPO_ROOT/scripts/start-web-prod.sh"
chmod +x "$REPO_ROOT/scripts/start-worker-prod.sh"
chmod +x "$REPO_ROOT/scripts/run-daily-export.sh"
chmod +x "$REPO_ROOT/scripts/run-daily-worker.sh"
chmod +x "$REPO_ROOT/scripts/run-daily-pipeline.sh"
chmod +x "$REPO_ROOT/scripts/healthcheck.sh"
chmod +x "$REPO_ROOT/scripts/verify-systemd.sh"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required."
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  echo "Node.js 20 or newer is required for production installs. Current: $(node -v)"
  exit 1
fi

render_unit \
  "$REPO_ROOT/deploy/systemd/fire-risk-web.service" \
  "$TMP_DIR/fire-risk-web.service"
render_unit \
  "$REPO_ROOT/deploy/systemd/fire-risk-worker.service" \
  "$TMP_DIR/fire-risk-worker.service"
render_unit \
  "$REPO_ROOT/deploy/systemd/fire-risk-daily-run.service" \
  "$TMP_DIR/fire-risk-daily-run.service"

sudo cp "$TMP_DIR/fire-risk-web.service" "$SYSTEMD_DIR/"
sudo cp "$TMP_DIR/fire-risk-worker.service" "$SYSTEMD_DIR/"
sudo cp "$TMP_DIR/fire-risk-daily-run.service" "$SYSTEMD_DIR/"
sudo cp "$REPO_ROOT/deploy/systemd/fire-risk-daily-run.timer" "$SYSTEMD_DIR/"

echo "Reloading systemd..."
sudo systemctl daemon-reload

echo "Enabling services..."
sudo systemctl enable fire-risk-web.service
sudo systemctl enable fire-risk-worker.service
sudo systemctl enable fire-risk-daily-run.timer

echo "Starting services..."
sudo systemctl restart fire-risk-web.service
sudo systemctl restart fire-risk-worker.service
sudo systemctl restart fire-risk-daily-run.timer

echo "Systemd installation completed."
echo
echo "Current service status:"
sudo systemctl --no-pager --lines=0 status fire-risk-web.service fire-risk-worker.service fire-risk-daily-run.timer || true
echo
echo "Next timer run:"
sudo systemctl list-timers fire-risk-daily-run.timer --no-pager || true
