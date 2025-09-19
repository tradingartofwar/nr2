# Neural Resonance Pilot Service

This service exposes health and status endpoints backed by a local JSON state directory. All state reads and writes are scoped to `NR_STATE_DIR`.

## Quickstart

```bash
export NR_STATE_DIR="/path/to/nr/state"
export NR_ALLOW_INIT_DIR=true   # optional: create the directory if missing

npm install
npm run dev
```

With the server running:

```bash
curl -s http://localhost:5000/status | jq .
```

## Developer helpers

- `dev.http` – REST client snippets for `/healthz` and `/status`.
- `scripts/dev-doctor.sh` – shell doctor that verifies the service responds with a state directory and numeric counts.

Ensure `jq` is available before running the doctor script.
