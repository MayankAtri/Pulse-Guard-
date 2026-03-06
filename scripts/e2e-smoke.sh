#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4000}"
BOOT_STACK="${BOOT_STACK:-1}"
KEEP_STACK="${KEEP_STACK:-0}"
COOKIE_OWNER="/tmp/pulseguard-smoke-owner.cookies"
COOKIE_VIEWER="/tmp/pulseguard-smoke-viewer.cookies"

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

extract_json() {
  local json="$1"
  local script="$2"

  JSON_INPUT="$json" EXTRACT_SCRIPT="$script" node -e '
const data = JSON.parse(process.env.JSON_INPUT);
const fn = new Function("data", process.env.EXTRACT_SCRIPT);
const out = fn(data);
if (out === undefined || out === null) process.stdout.write("");
else process.stdout.write(String(out));
'
}

http_call() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  local cookie_jar="${4:-}"
  local raw

  local args=(-sS -X "$method" "$url" -w $'\n%{http_code}')
  if [[ -n "$cookie_jar" ]]; then
    args+=(-b "$cookie_jar" -c "$cookie_jar")
  fi

  if [[ -n "$body" ]]; then
    args+=(-H 'Content-Type: application/json' -d "$body")
  fi

  raw="$(curl "${args[@]}" 2>/dev/null || true)"
  if [[ -z "$raw" ]]; then
    HTTP_STATUS="000"
    HTTP_BODY=""
    return 0
  fi
  HTTP_STATUS="${raw##*$'\n'}"
  HTTP_BODY="${raw%$'\n'*}"
}

wait_ready() {
  for _ in {1..50}; do
    http_call "GET" "$BASE_URL/ready"
    if [[ "$HTTP_STATUS" == "200" ]]; then
      return 0
    fi
    sleep 2
  done
  fail "API not ready"
}

wait_for_condition() {
  local label="$1"
  local method="$2"
  local url="$3"
  local expected_status="$4"
  local check="$5"
  local retries="${6:-40}"
  local delay_sec="${7:-2}"
  local cookie_jar="${8:-}"

  for ((i=1; i<=retries; i++)); do
    http_call "$method" "$url" "" "$cookie_jar"
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

  fail "$label condition not met"
}

cleanup() {
  rm -f "$COOKIE_OWNER" "$COOKIE_VIEWER"
  if [[ "$BOOT_STACK" == "1" && "$KEEP_STACK" != "1" ]]; then
    log "Stopping stack"
    docker compose down >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

if [[ "$BOOT_STACK" == "1" ]]; then
  log "Starting stack for smoke tests"
  DEV_AUTH_BYPASS=false EMAIL_TRANSPORT=log docker compose up -d --build >/dev/null
fi

wait_ready

log "S1: unauthenticated route must be blocked"
http_call "GET" "$BASE_URL/api/workspaces"
[[ "$HTTP_STATUS" == "401" ]] || fail "S1 expected 401, got $HTTP_STATUS"

OWNER_EMAIL="smoke-owner-$(date +%s)@pulseguard.local"
OWNER_PASS='Passw0rd!'
VIEWER_EMAIL="smoke-viewer-$(date +%s)@pulseguard.local"
VIEWER_PASS='Passw0rd!'

log "S2: signup owner"
http_call "POST" "$BASE_URL/api/auth/signup" "{\"email\":\"$OWNER_EMAIL\",\"password\":\"$OWNER_PASS\",\"name\":\"Smoke Owner\"}" "$COOKIE_OWNER"
[[ "$HTTP_STATUS" == "201" ]] || fail "S2 expected 201, got $HTTP_STATUS"

log "S3: owner workspace exists"
http_call "GET" "$BASE_URL/api/workspaces" "" "$COOKIE_OWNER"
[[ "$HTTP_STATUS" == "200" ]] || fail "S3 expected 200, got $HTTP_STATUS"
WORKSPACE_ID="$(extract_json "$HTTP_BODY" 'return data.workspaces?.[0]?.id;')"
[[ -n "$WORKSPACE_ID" ]] || fail "S3 missing workspace id"

log "S4: signup viewer and add to team"
http_call "POST" "$BASE_URL/api/auth/signup" "{\"email\":\"$VIEWER_EMAIL\",\"password\":\"$VIEWER_PASS\",\"name\":\"Smoke Viewer\"}" "$COOKIE_VIEWER"
[[ "$HTTP_STATUS" == "201" ]] || fail "S4 signup expected 201, got $HTTP_STATUS"

http_call "POST" "$BASE_URL/api/workspaces/$WORKSPACE_ID/members" "{\"email\":\"$VIEWER_EMAIL\",\"role\":\"VIEWER\"}" "$COOKIE_OWNER"
[[ "$HTTP_STATUS" == "201" ]] || fail "S4 add member expected 201, got $HTTP_STATUS"

log "S5: viewer RBAC checks"
http_call "POST" "$BASE_URL/api/workspaces/$WORKSPACE_ID/members" "{\"email\":\"x@y.z\",\"role\":\"VIEWER\"}" "$COOKIE_VIEWER"
[[ "$HTTP_STATUS" == "403" ]] || fail "S5 members create expected 403, got $HTTP_STATUS"
http_call "POST" "$BASE_URL/api/workspaces/$WORKSPACE_ID/monitors" "{\"name\":\"viewer monitor\",\"url\":\"http://api:4000/mock/health\",\"expectedStatus\":200,\"expectedKeyword\":\"up\",\"timeoutMs\":5000,\"intervalSeconds\":60}" "$COOKIE_VIEWER"
[[ "$HTTP_STATUS" == "403" ]] || fail "S5 monitor create expected 403, got $HTTP_STATUS"

log "S6: owner creates monitor"
http_call "POST" "$BASE_URL/api/workspaces/$WORKSPACE_ID/monitors" "{\"name\":\"Smoke Mock\",\"url\":\"http://api:4000/mock/health\",\"expectedStatus\":200,\"expectedKeyword\":\"up\",\"timeoutMs\":5000,\"intervalSeconds\":60}" "$COOKIE_OWNER"
[[ "$HTTP_STATUS" == "201" ]] || fail "S6 expected 201, got $HTTP_STATUS"
MONITOR_ID="$(extract_json "$HTTP_BODY" 'return data.monitor?.id;')"
[[ -n "$MONITOR_ID" ]] || fail "S6 missing monitor id"

log "S7: incident opens after 3 failures"
http_call "POST" "$BASE_URL/mock/toggle" '{"healthy":false,"body":"forced-down"}'
[[ "$HTTP_STATUS" == "200" ]] || fail "S7 toggle down expected 200"
for _ in 1 2 3; do
  http_call "POST" "$BASE_URL/api/workspaces/$WORKSPACE_ID/monitors/$MONITOR_ID/run-check" "" "$COOKIE_OWNER"
  [[ "$HTTP_STATUS" == "202" ]] || fail "S7 run-check expected 202, got $HTTP_STATUS"
done

wait_for_condition \
  "S7 incident open" \
  "GET" \
  "$BASE_URL/api/workspaces/$WORKSPACE_ID/incidents" \
  "200" \
  "return Array.isArray(data.incidents) && data.incidents.some(i => i.monitorId === '$MONITOR_ID' && i.status === 'OPEN');" \
  40 2 "$COOKIE_OWNER"

http_call "GET" "$BASE_URL/api/workspaces/$WORKSPACE_ID/incidents" "" "$COOKIE_OWNER"
INCIDENT_ID="$(extract_json "$HTTP_BODY" 'const row=(data.incidents||[]).find(i=>i.monitorId==="'"$MONITOR_ID"'" && i.status==="OPEN"); return row?.id;')"
[[ -n "$INCIDENT_ID" ]] || fail "S7 missing open incident id"

log "S8: incident resolves after 2 successes"
http_call "POST" "$BASE_URL/mock/toggle" '{"healthy":true,"body":"up"}'
[[ "$HTTP_STATUS" == "200" ]] || fail "S8 toggle up expected 200"
for _ in 1 2; do
  http_call "POST" "$BASE_URL/api/workspaces/$WORKSPACE_ID/monitors/$MONITOR_ID/run-check" "" "$COOKIE_OWNER"
  [[ "$HTTP_STATUS" == "202" ]] || fail "S8 run-check expected 202, got $HTTP_STATUS"
done

wait_for_condition \
  "S8 incident resolved" \
  "GET" \
  "$BASE_URL/api/workspaces/$WORKSPACE_ID/incidents/$INCIDENT_ID" \
  "200" \
  "return data.incident?.status === 'RESOLVED';" \
  40 2 "$COOKIE_OWNER"

log "S9: verify incident timeline events"
http_call "GET" "$BASE_URL/api/workspaces/$WORKSPACE_ID/incidents/$INCIDENT_ID" "" "$COOKIE_OWNER"
[[ "$HTTP_STATUS" == "200" ]] || fail "S9 expected 200, got $HTTP_STATUS"
assert_json "$HTTP_BODY" 'const events=data.incident?.events||[]; return events.some(e=>e.type==="OPENED") && events.some(e=>e.type==="RESOLVED");' "S9 expected OPENED and RESOLVED events"

log "Smoke E2E passed"
