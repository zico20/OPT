#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${FIRE_RISK_REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

cd "$REPO_ROOT"

# Load .env so NEXT_PUBLIC_* vars are baked into the build.
# Next.js inlines NEXT_PUBLIC_* at build time, not runtime — without this,
# the browser bundle ends up with `undefined` for Supabase URL/anon key.
load_dotenv() {
  local env_file="$1"
  [[ -f "$env_file" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    case "$line" in
      ''|\#*) continue ;;
      *=*)
        local key="${line%%=*}"
        local value="${line#*=}"
        if [[ -n "${!key-}" ]]; then continue; fi
        if [[ ("$value" == \"*\" && "$value" == *\") || ("$value" == \'*\' && "$value" == *\') ]]; then
          value="${value:1:${#value}-2}"
        fi
        export "$key=$value"
        ;;
    esac
  done < "$env_file"
}

load_dotenv "$REPO_ROOT/.env"

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
