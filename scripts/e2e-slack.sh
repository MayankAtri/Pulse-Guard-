#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4000}"
BOOT_STACK="${BOOT_STACK:-1}"
KEEP_STACK="${KEEP_STACK:-0}"
WS_ID="${WS_ID:-00000000-0000-0000-0000-000000000001}"
MOCK_MONITOR_ID="${MOCK_MONITOR_ID:-00000000-0000-0000-0000-000000000102}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-http://api:4000/mock/slack/webhook}"

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

wait_ready() {
  for _ in {1..40}; do
    if http_call "GET" "$BASE_URL/ready" 2>/dev/null; then
      if [[ "$HTTP_STATUS" == "200" ]]; then
        return
      fi
    fi
    sleep 2
  done
  fail "API not ready"
}

wait_for_json_check() {
  local label="$1"
  local url="$2"
  local script="$3"

  for _ in {1..30}; do
    http_call "GET" "$url"
    if JSON_INPUT="$HTTP_BODY" CHECK_SCRIPT="$script" node -e '
const data = JSON.parse(process.env.JSON_INPUT);
const fn = new Function("data", process.env.CHECK_SCRIPT);
process.exit(fn(data) ? 0 : 1);
'; then
      log "$label condition met"
      return
    fi
    sleep 2
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
  log "Starting stack for Slack alerts tests"
  DEV_AUTH_BYPASS=true EMAIL_TRANSPORT=log docker compose up -d --build >/dev/null
fi

wait_ready

log "S1: configure workspace Slack alerts"
http_call "PUT" "$BASE_URL/api/workspaces/$WS_ID/alerts" "{\"slackEnabled\":true,\"slackWebhookUrl\":\"$SLACK_WEBHOOK_URL\"}"
[[ "$HTTP_STATUS" == "200" ]] || fail "S1 expected 200"

log "S2: clear mock Slack events and ensure monitor active"
http_call "DELETE" "$BASE_URL/mock/slack/events"
[[ "$HTTP_STATUS" == "204" ]] || fail "S2 expected 204"
http_call "PUT" "$BASE_URL/api/workspaces/$WS_ID/monitors/$MOCK_MONITOR_ID" '{"isPaused":false}'
[[ "$HTTP_STATUS" == "200" ]] || fail "S2 monitor update expected 200"
http_call "POST" "$BASE_URL/mock/toggle" '{"healthy":true,"body":"up"}'
[[ "$HTTP_STATUS" == "200" ]] || fail "S2 healthy toggle expected 200"
for _ in 1 2 3; do
  http_call "POST" "$BASE_URL/api/workspaces/$WS_ID/monitors/$MOCK_MONITOR_ID/run-check"
  [[ "$HTTP_STATUS" == "202" ]] || fail "S2 baseline run-check expected 202"
done

wait_for_json_check \
  "No open incident baseline" \
  "$BASE_URL/api/workspaces/$WS_ID/incidents" \
  "return !(data.incidents||[]).some(i => i.monitorId===\"$MOCK_MONITOR_ID\" && i.status===\"OPEN\");"

log "S3: force incident open for mock monitor"
http_call "POST" "$BASE_URL/mock/toggle" '{"healthy":false,"body":"forced down"}'
[[ "$HTTP_STATUS" == "200" ]] || fail "S3 toggle expected 200"
for _ in 1 2 3; do
  http_call "POST" "$BASE_URL/api/workspaces/$WS_ID/monitors/$MOCK_MONITOR_ID/run-check"
  [[ "$HTTP_STATUS" == "202" ]] || fail "S3 run-check expected 202"
done

wait_for_json_check \
  "Opened SLACK notification" \
  "$BASE_URL/api/workspaces/$WS_ID/notifications" \
  'return (data.notifications||[]).some(n => n.type==="INCIDENT_OPENED" && n.channel==="SLACK" && n.status==="SENT");'

wait_for_json_check \
  "Opened Slack webhook payload" \
  "$BASE_URL/mock/slack/events" \
  'return (data.events||[]).some(e => (e.text||"").includes("Incident opened."));'

log "S4: force incident resolve for mock monitor"
http_call "POST" "$BASE_URL/mock/toggle" '{"healthy":true,"body":"up"}'
[[ "$HTTP_STATUS" == "200" ]] || fail "S4 toggle expected 200"
for _ in 1 2; do
  http_call "POST" "$BASE_URL/api/workspaces/$WS_ID/monitors/$MOCK_MONITOR_ID/run-check"
  [[ "$HTTP_STATUS" == "202" ]] || fail "S4 run-check expected 202"
done

wait_for_json_check \
  "Resolved SLACK notification" \
  "$BASE_URL/api/workspaces/$WS_ID/notifications" \
  'return (data.notifications||[]).some(n => n.type==="INCIDENT_RESOLVED" && n.channel==="SLACK" && n.status==="SENT");'

wait_for_json_check \
  "Resolved Slack webhook payload" \
  "$BASE_URL/mock/slack/events" \
  'return (data.events||[]).some(e => (e.text||"").includes("Incident resolved."));'

log "Slack alerts E2E passed"
