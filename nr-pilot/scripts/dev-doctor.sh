#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-5000}"
BASE_URL="${NR_BASE_URL:-http://localhost:${PORT}}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for the doctor script" >&2
  exit 1
fi

echo "== /healthz =="
curl -s "$BASE_URL/healthz" | jq .

echo "== /status =="
status_json=$(curl -s "$BASE_URL/status")
echo "$status_json" | jq .

state_dir=$(echo "$status_json" | jq -r '.stateDir // empty')
if [[ -z "$state_dir" ]]; then
  echo "State directory missing in status response" >&2
  exit 1
fi

nodes_count=$(echo "$status_json" | jq -r '.counts.nodes // empty')
suggestions_count=$(echo "$status_json" | jq -r '.counts.suggestions // empty')
consents_count=$(echo "$status_json" | jq -r '.counts.consents // empty')

for value in "$nodes_count" "$suggestions_count" "$consents_count"; do
  if [[ ! "$value" =~ ^[0-9]+$ ]]; then
    echo "Non-numeric count detected: $value" >&2
    exit 1
  fi
done

echo "Doctor checks passed"
