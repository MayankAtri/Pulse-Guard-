#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4000}"
BOOT_STACK="${BOOT_STACK:-1}"
KEEP_STACK="${KEEP_STACK:-0}"
COOKIE_JAR="/tmp/pulseguard-auth.cookies"

log() {
  printf '\n[%s] %s\n' "$(date +'%H:%M:%S')" "$1"
}

fail() {
  printf '\nERROR: %s\n' "$1" >&2
  exit 1
}

http_call() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  local with_cookies="${4:-0}"
  local raw

  local args=(-sS -X "$method" "$url" -w $'\n%{http_code}')
  if [[ "$with_cookies" == "1" ]]; then
    args+=(-b "$COOKIE_JAR" -c "$COOKIE_JAR")
  fi

  if [[ -n "$body" ]]; then
    args+=(-H 'Content-Type: application/json' -d "$body")
  fi

  raw="$(curl "${args[@]}")"
  HTTP_STATUS="${raw##*$'\n'}"
  HTTP_BODY="${raw%$'\n'*}"
}

wait_ready() {
  for _ in {1..40}; do
    if curl -sS "$BASE_URL/ready" >/dev/null 2>&1; then
      http_call "GET" "$BASE_URL/ready"
      if [[ "$HTTP_STATUS" == "200" ]]; then
        return 0
      fi
    fi
    sleep 2
  done

  fail "API not ready"
}

cleanup() {
  rm -f "$COOKIE_JAR"
  if [[ "$BOOT_STACK" == "1" && "$KEEP_STACK" != "1" ]]; then
    log "Stopping stack"
    docker compose down >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

if [[ "$BOOT_STACK" == "1" ]]; then
  log "Starting stack with auth bypass disabled"
  DEV_AUTH_BYPASS=false docker compose up -d --build >/dev/null
fi

wait_ready

log "A1: protected route without auth should fail"
http_call "GET" "$BASE_URL/api/workspaces"
[[ "$HTTP_STATUS" == "401" ]] || fail "A1 expected 401, got $HTTP_STATUS"

EMAIL="auth-e2e-$(date +%s)@pulseguard.local"
PASSWORD='Passw0rd!'

log "A2: signup should set auth cookies"
http_call "POST" "$BASE_URL/api/auth/signup" "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Auth E2E\"}" 1
[[ "$HTTP_STATUS" == "201" ]] || fail "A2 expected 201, got $HTTP_STATUS"

log "A3: protected route with auth should succeed"
http_call "GET" "$BASE_URL/api/workspaces" "" 1
[[ "$HTTP_STATUS" == "200" ]] || fail "A3 expected 200, got $HTTP_STATUS"
WS_ID="$(JSON_INPUT="$HTTP_BODY" node -e 'const d=JSON.parse(process.env.JSON_INPUT); process.stdout.write(d.workspaces?.[0]?.id || "")')"
[[ -n "$WS_ID" ]] || fail "A3 expected a workspace id"

log "A4: logout should invalidate session"
http_call "POST" "$BASE_URL/api/auth/logout" "" 1
[[ "$HTTP_STATUS" == "204" ]] || fail "A4 expected 204, got $HTTP_STATUS"
http_call "GET" "$BASE_URL/api/workspaces" "" 1
[[ "$HTTP_STATUS" == "401" ]] || fail "A4 post-logout expected 401, got $HTTP_STATUS"

log "A5: login should restore session"
http_call "POST" "$BASE_URL/api/auth/login" "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" 1
[[ "$HTTP_STATUS" == "200" ]] || fail "A5 expected 200, got $HTTP_STATUS"
http_call "GET" "$BASE_URL/api/workspaces" "" 1
[[ "$HTTP_STATUS" == "200" ]] || fail "A5 protected route after login expected 200, got $HTTP_STATUS"

log "Auth E2E passed"
