#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4000}"
BOOT_STACK="${BOOT_STACK:-1}"
KEEP_STACK="${KEEP_STACK:-0}"
WS_ID="${WS_ID:-00000000-0000-0000-0000-000000000001}"
MOCK_MONITOR_ID="${MOCK_MONITOR_ID:-00000000-0000-0000-0000-000000000102}"

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
  local raw

  if [[ -n "$body" ]]; then
    raw="$(curl -sS -X "$method" "$url" -H 'Content-Type: application/json' -d "$body" -w $'\n%{http_code}')"
  else
    raw="$(curl -sS -X "$method" "$url" -w $'\n%{http_code}')"
  fi

  HTTP_STATUS="${raw##*$'\n'}"
  HTTP_BODY="${raw%$'\n'*}"
}

wait_for_condition() {
  local label="$1"
  local check_script="$2"
  local retries="${3:-30}"
  local delay_sec="${4:-2}"

  for ((i=1; i<=retries; i++)); do
    if JSON_INPUT="$HTTP_BODY" CHECK_SCRIPT="$check_script" node -e '
const data = JSON.parse(process.env.JSON_INPUT);
const fn = new Function("data", process.env.CHECK_SCRIPT);
process.exit(fn(data) ? 0 : 1);
'; then
      log "$label condition met"
      return 0
    fi
    sleep "$delay_sec"
    http_call "GET" "$BASE_URL/api/workspaces/$WS_ID/notifications"
  done

  fail "$label condition not met"
}

cleanup() {
  if [[ "$BOOT_STACK" == "1" && "$KEEP_STACK" != "1" ]]; then
    log "Stopping stack"
    docker compose down >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

if [[ "$BOOT_STACK" == "1" ]]; then
  log "Starting stack for email alert tests"
  DEV_AUTH_BYPASS=true EMAIL_TRANSPORT=log docker compose up -d --build >/dev/null
fi

for _ in {1..40}; do
  if curl -sS "$BASE_URL/ready" >/dev/null 2>&1; then
    http_call "GET" "$BASE_URL/ready"
    if [[ "$HTTP_STATUS" == "200" ]]; then
      break
    fi
  fi
  sleep 2
done

log "E1: clear mock to healthy and ensure monitor active"
http_call "POST" "$BASE_URL/mock/toggle" '{"healthy":true,"body":"up"}'
[[ "$HTTP_STATUS" == "200" ]] || fail "E1 expected 200"
http_call "PUT" "$BASE_URL/api/workspaces/$WS_ID/monitors/$MOCK_MONITOR_ID" '{"isPaused":false}'
[[ "$HTTP_STATUS" == "200" ]] || fail "E1 expected monitor update 200"

log "E2: force incident open (3 failures)"
http_call "POST" "$BASE_URL/mock/toggle" '{"healthy":false,"body":"forced down"}'
[[ "$HTTP_STATUS" == "200" ]] || fail "E2 toggle expected 200"
for _ in 1 2 3; do
  http_call "POST" "$BASE_URL/api/workspaces/$WS_ID/monitors/$MOCK_MONITOR_ID/run-check"
  [[ "$HTTP_STATUS" == "202" ]] || fail "E2 run-check expected 202"
done

sleep 4
http_call "GET" "$BASE_URL/api/workspaces/$WS_ID/notifications"
[[ "$HTTP_STATUS" == "200" ]] || fail "E2 notifications expected 200"
wait_for_condition "Opened notification" 'return (data.notifications||[]).some(n => n.type === "INCIDENT_OPENED" && n.status === "SENT");'

log "E3: force incident resolve (2 successes)"
http_call "POST" "$BASE_URL/mock/toggle" '{"healthy":true,"body":"up"}'
[[ "$HTTP_STATUS" == "200" ]] || fail "E3 toggle expected 200"
for _ in 1 2; do
  http_call "POST" "$BASE_URL/api/workspaces/$WS_ID/monitors/$MOCK_MONITOR_ID/run-check"
  [[ "$HTTP_STATUS" == "202" ]] || fail "E3 run-check expected 202"
done

sleep 4
http_call "GET" "$BASE_URL/api/workspaces/$WS_ID/notifications"
[[ "$HTTP_STATUS" == "200" ]] || fail "E3 notifications expected 200"
wait_for_condition "Resolved notification" 'return (data.notifications||[]).some(n => n.type === "INCIDENT_RESOLVED" && n.status === "SENT");'

log "Email alerts E2E passed"
