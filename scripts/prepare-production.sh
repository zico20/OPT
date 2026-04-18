#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${FIRE_RISK_REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

cd "$REPO_ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required."
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  echo "Node.js 20 or newer is required for production. Current: $(node -v)"
  exit 1
fi

echo "Installing dependencies..."
npm ci

echo "Building production web app..."
npm run build:web

echo "Production preparation completed."
