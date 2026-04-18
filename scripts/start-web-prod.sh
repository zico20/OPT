#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${FIRE_RISK_REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

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
        if [[ -n "${!key-}" ]]; then
          continue
        fi
        if [[ ("$value" == \"*\" && "$value" == *\") || ("$value" == \'*\' && "$value" == *\') ]]; then
          value="${value:1:${#value}-2}"
        fi
        export "$key=$value"
        ;;
    esac
  done < "$env_file"
}

cd "$REPO_ROOT"

load_dotenv "$REPO_ROOT/.env"

export NODE_ENV=production

if [[ ! -d "$REPO_ROOT/apps/web/.next" ]]; then
  npm run build --workspace @fire-risk/web
fi

exec npm run start --workspace @fire-risk/web -- --hostname 127.0.0.1 --port "${WEB_PORT:-3000}"
