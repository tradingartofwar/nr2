#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:4000}"
JWT="${APN_JWT:-}"

if [[ -z "${JWT}" ]]; then
  echo "APN_JWT environment variable is required for authenticated checks." >&2
  exit 1
fi

auth=(-H "Authorization: Bearer ${JWT}")
json_header=(-H "content-type: application/json")

run() {
  echo "== $1 =="
  shift
  curl -s "$@" | jq .
  echo
}

run "/healthz" "$API_BASE/healthz"
run "/" "$API_BASE/"

echo "== submissions unauthenticated (expect 401) =="
curl -s -o /tmp/dev-doctor-unauth.out -w "HTTP:%{http_code}\n" \
  -X POST "$API_BASE/rooms/room-1/submissions" "${json_header[@]}" \
  -d '{"payload":{"msg":"unauth","ts":"'"$(date -Is)"'"}}'
cat /tmp/dev-doctor-unauth.out
echo

run "rooms list" "${auth[@]}" "$API_BASE/rooms"

RID=$(curl -s -X POST "${auth[@]}" "${json_header[@]}" "$API_BASE/rooms" \
  -d '{"name":"room-1"}' | jq -er '.data.id')

echo "RID=${RID}"

doc_payload=$(jq -nc --arg now "$(date -Is)" '{payload:{msg:"doctor",ts:$now}}')

run "submit via slug" -X POST "${auth[@]}" "${json_header[@]}" \
  "$API_BASE/rooms/room-1/submissions" -d "$doc_payload"
run "submissions by slug" "${auth[@]}" "$API_BASE/rooms/room-1/submissions"
run "submissions by uuid" "${auth[@]}" "$API_BASE/rooms/${RID}/submissions"
