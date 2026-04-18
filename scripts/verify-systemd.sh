#!/usr/bin/env bash
set -euo pipefail

echo "Service status:"
sudo systemctl --no-pager --lines=0 status \
  fire-risk-web.service \
  fire-risk-worker.service \
  fire-risk-daily-run.timer

echo
echo "Next scheduled daily run:"
sudo systemctl list-timers fire-risk-daily-run.timer --no-pager

echo
echo "Recent daily-run logs:"
sudo journalctl -u fire-risk-daily-run.service -n 20 --no-pager
