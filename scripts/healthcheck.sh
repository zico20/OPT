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

WEB_PORT="${WEB_PORT:-3000}"
WORKER_PORT="${WORKER_PORT:-8080}"
PUBLIC_URL="${HEALTHCHECK_PUBLIC_URL:-${APP_PUBLIC_URL:-${NEXT_PUBLIC_BASE_URL:-}}}"

check_url() {
  local label="$1"
  local url="$2"

  echo "Checking ${label}: ${url}"
  curl --silent --show-error --fail --location --max-time 20 "$url" >/dev/null
  echo "OK: ${label}"
}

check_json_ok() {
  local label="$1"
  local url="$2"

  echo "Checking ${label}: ${url}"
  local body
  body="$(curl --silent --show-error --fail --max-time 20 "$url")"
  if [[ "$body" != *'"ok": true'* && "$body" != *'"ok":true'* ]]; then
    echo "Healthcheck failed for ${label}. Response:"
    echo "$body"
    exit 1
  fi
  echo "OK: ${label}"
}

check_url "web-local" "http://127.0.0.1:${WEB_PORT}"
check_json_ok "worker-local" "http://127.0.0.1:${WORKER_PORT}/health"

if [[ -n "$PUBLIC_URL" ]]; then
  check_url "web-public" "$PUBLIC_URL"
fi

echo "All healthchecks passed."
