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

exec npm run run:weather --workspace @fire-risk/worker -- "$@"
