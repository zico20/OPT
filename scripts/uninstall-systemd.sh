#!/usr/bin/env bash
set -euo pipefail

echo "Stopping services..."
sudo systemctl stop fire-risk-web.service || true
sudo systemctl stop fire-risk-worker.service || true
sudo systemctl stop fire-risk-daily-run.timer || true
sudo systemctl stop fire-risk-weather-run.timer || true

echo "Disabling services..."
sudo systemctl disable fire-risk-web.service || true
sudo systemctl disable fire-risk-worker.service || true
sudo systemctl disable fire-risk-daily-run.timer || true
sudo systemctl disable fire-risk-weather-run.timer || true

echo "Removing unit files..."
sudo rm -f /etc/systemd/system/fire-risk-web.service
sudo rm -f /etc/systemd/system/fire-risk-worker.service
sudo rm -f /etc/systemd/system/fire-risk-daily-run.service
sudo rm -f /etc/systemd/system/fire-risk-daily-run.timer
sudo rm -f /etc/systemd/system/fire-risk-weather-run.service
sudo rm -f /etc/systemd/system/fire-risk-weather-run.timer

sudo systemctl daemon-reload

echo "Systemd units removed."
