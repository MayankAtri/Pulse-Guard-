#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4000}"
WS_ID="${WS_ID:-00000000-0000-0000-0000-000000000001}"
HEAL_MONITOR_ID="${HEAL_MONITOR_ID:-00000000-0000-0000-0000-000000000101}"
MOCK_MONITOR_ID="${MOCK_MONITOR_ID:-00000000-0000-0000-0000-000000000102}"
BOOT_STACK="${BOOT_STACK:-1}"
KEEP_STACK="${KEEP_STACK:-0}"

log() {
  printf '\n[%s] %s\n' "$(date +'%H:%M:%S')" "$1"
}

fail() {
  printf '\nERROR: %s\n' "$1" >&2
  exit 1
}

assert_json() {
  local json="$1"
  local check="$2"
  local message="$3"

  JSON_INPUT="$json" CHECK_SCRIPT="$check" MESSAGE="$message" node -e '
const input = process.env.JSON_INPUT;
const check = process.env.CHECK_SCRIPT;
const message = process.env.MESSAGE;
const data = JSON.parse(input);
const fn = new Function("data", check);
if (!fn(data)) {
  console.error(message);
  process.exit(1);
}
'
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

wait_for_ok() {
  local label="$1"
  local url="$2"
  local expected_status="$3"
  local retries="${4:-40}"
  local delay_sec="${5:-2}"

  for ((i=1; i<=retries; i++)); do
    if curl -sS "$url" >/dev/null 2>&1; then
      http_call "GET" "$url"
      if [[ "$HTTP_STATUS" == "$expected_status" ]]; then
        log "$label ready"
        return 0
      fi
    fi
    sleep "$delay_sec"
  done

  fail "$label did not become ready in time"
}

wait_for_condition() {
  local label="$1"
  local url="$2"
  local expected_status="$3"
  local check="$4"
  local retries="${5:-30}"
  local delay_sec="${6:-2}"

  for ((i=1; i<=retries; i++)); do
    http_call "GET" "$url"
    if [[ "$HTTP_STATUS" == "$expected_status" ]]; then
      if JSON_INPUT="$HTTP_BODY" CHECK_SCRIPT="$check" node -e '
const data = JSON.parse(process.env.JSON_INPUT);
const fn = new Function("data", process.env.CHECK_SCRIPT);
process.exit(fn(data) ? 0 : 1);
'; then
        log "$label condition met"
        return 0
      fi
    fi
    sleep "$delay_sec"
  done

  fail "$label condition not met in time"
}

cleanup() {
  if [[ "$BOOT_STACK" == "1" && "$KEEP_STACK" != "1" ]]; then
    log "Stopping stack"
    docker compose down >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

if [[ "$BOOT_STACK" == "1" ]]; then
  log "Starting docker stack"
  docker compose up -d --build >/dev/null
fi

wait_for_ok "API health" "$BASE_URL/health" "200"
wait_for_ok "API readiness" "$BASE_URL/ready" "200"

log "T1: run-checks filtered by workspace+monitor"
http_call "POST" "$BASE_URL/api/admin/run-checks" "{\"workspaceId\":\"$WS_ID\",\"monitorId\":\"$HEAL_MONITOR_ID\"}"
[[ "$HTTP_STATUS" == "200" ]] || fail "T1 expected HTTP 200, got $HTTP_STATUS"
assert_json "$HTTP_BODY" 'return data.enqueued >= 1;' "T1 expected enqueued >= 1"

log "T2: monitor checks (limit=1)"
sleep 3
http_call "GET" "$BASE_URL/api/workspaces/$WS_ID/monitors/$HEAL_MONITOR_ID/checks?limit=1"
[[ "$HTTP_STATUS" == "200" ]] || fail "T2 expected HTTP 200, got $HTTP_STATUS"
assert_json "$HTTP_BODY" 'return Array.isArray(data.checks) && data.checks.length === 1;' "T2 expected exactly one check row"

log "T3: invalid limit should be 400 and not crash API"
http_call "GET" "$BASE_URL/api/workspaces/$WS_ID/monitors/$HEAL_MONITOR_ID/checks?limit=0"
[[ "$HTTP_STATUS" == "400" ]] || fail "T3 expected HTTP 400, got $HTTP_STATUS"
assert_json "$HTTP_BODY" 'return typeof data.error === "string";' "T3 expected validation payload"
http_call "GET" "$BASE_URL/health"
[[ "$HTTP_STATUS" == "200" ]] || fail "T3 health probe expected 200, got $HTTP_STATUS"

log "T4: paused monitor should reject run-check"
http_call "PUT" "$BASE_URL/api/workspaces/$WS_ID/monitors/$MOCK_MONITOR_ID" '{"isPaused":true}'
[[ "$HTTP_STATUS" == "200" ]] || fail "T4 pause expected 200, got $HTTP_STATUS"
http_call "POST" "$BASE_URL/api/workspaces/$WS_ID/monitors/$MOCK_MONITOR_ID/run-check"
[[ "$HTTP_STATUS" == "409" ]] || fail "T4 run-check expected 409 while paused, got $HTTP_STATUS"

log "T5: unknown workspace enqueue should be zero"
http_call "POST" "$BASE_URL/api/admin/run-checks" '{"workspaceId":"00000000-0000-0000-0000-00000000dead"}'
[[ "$HTTP_STATUS" == "200" ]] || fail "T5 expected HTTP 200, got $HTTP_STATUS"
assert_json "$HTTP_BODY" 'return data.enqueued === 0;' "T5 expected enqueued 0"

log "T6: incident OPEN after three failures"
http_call "PUT" "$BASE_URL/api/workspaces/$WS_ID/monitors/$MOCK_MONITOR_ID" '{"isPaused":false}'
[[ "$HTTP_STATUS" == "200" ]] || fail "T6 unpause expected 200, got $HTTP_STATUS"
http_call "POST" "$BASE_URL/mock/toggle" '{"healthy":false,"body":"forced down"}'
[[ "$HTTP_STATUS" == "200" ]] || fail "T6 toggle down expected 200, got $HTTP_STATUS"

for _ in 1 2 3; do
  http_call "POST" "$BASE_URL/api/workspaces/$WS_ID/monitors/$MOCK_MONITOR_ID/run-check"
  [[ "$HTTP_STATUS" == "202" ]] || fail "T6 run-check expected 202, got $HTTP_STATUS"
done

wait_for_condition \
  "T6 incident open" \
  "$BASE_URL/api/workspaces/$WS_ID/incidents" \
  "200" \
  "return Array.isArray(data.incidents) && data.incidents.some(i => i.monitorId === \"$MOCK_MONITOR_ID\" && i.status === \"OPEN\");" \
  30 \
  2

http_call "GET" "$BASE_URL/api/workspaces/$WS_ID/incidents"
OPEN_INCIDENT_ID="$(JSON_INPUT="$HTTP_BODY" node -e '
const data = JSON.parse(process.env.JSON_INPUT);
const incident = (data.incidents || []).find((i) => i.monitorId === process.argv[1] && i.status === "OPEN");
process.stdout.write(incident ? incident.id : "");
' "$MOCK_MONITOR_ID")"
[[ -n "$OPEN_INCIDENT_ID" ]] || fail "T6 expected an OPEN incident for mock monitor"

log "T7: incident RESOLVED after two successes"
http_call "POST" "$BASE_URL/mock/toggle" '{"healthy":true,"body":"up"}'
[[ "$HTTP_STATUS" == "200" ]] || fail "T7 toggle up expected 200, got $HTTP_STATUS"
for _ in 1 2; do
  http_call "POST" "$BASE_URL/api/workspaces/$WS_ID/monitors/$MOCK_MONITOR_ID/run-check"
  [[ "$HTTP_STATUS" == "202" ]] || fail "T7 run-check expected 202, got $HTTP_STATUS"
done

wait_for_condition \
  "T7 incident resolved" \
  "$BASE_URL/api/workspaces/$WS_ID/incidents/$OPEN_INCIDENT_ID" \
  "200" \
  "return data.incident && data.incident.status === \"RESOLVED\";" \
  30 \
  2

http_call "GET" "$BASE_URL/api/workspaces/$WS_ID/incidents/$OPEN_INCIDENT_ID"
assert_json "$HTTP_BODY" 'const events = data.incident?.events || []; return events.some(e => e.type === "OPENED") && events.some(e => e.type === "RESOLVED");' "T7 expected OPENED and RESOLVED events"

log "T8: queue stats endpoint"
http_call "GET" "$BASE_URL/api/admin/queue-stats"
[[ "$HTTP_STATUS" == "200" ]] || fail "T8 expected HTTP 200, got $HTTP_STATUS"
assert_json "$HTTP_BODY" 'return typeof data.waiting === "number" && typeof data.active === "number";' "T8 expected queue metric numbers"

log "All phase tests passed"
