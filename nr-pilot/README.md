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

### Deterministic seeding

Populate `state.nodes.json` and `state.suggestions.json` with deterministic demo data:

```bash
node scripts/seed-demo.cjs --cohort demo --n 50 --k 3 --seed 42 --force
```

Re-run the doctor or status check to confirm counts:

```bash
curl -s http://localhost:5000/status | jq '.counts'
```

### Admin utilities

- List pending suggestions:

  ```bash
  curl -s http://localhost:5000/admin/pending | jq '.data | length'
  ```

- Approve and advance consent state:

  ```bash
  curl -s -X POST http://localhost:5000/admin/approve \\
    -H 'content-type: application/json' \\
    -d '{"ids":["<suggestion-id>"]}'

  curl -s -X POST http://localhost:5000/consent \\
    -H 'content-type: application/json' \\
    -d '{"ids":["<suggestion-id>"],"action":"accept","userId":"userA"}'
  ```

- Reset suggestions while keeping nodes intact:

  ```bash
  curl -s -X POST http://localhost:5000/admin/reset | jq .
  ```

## Developer helpers

- `dev.http` – REST client snippets for `/healthz` and `/status`.
- `scripts/dev-doctor.sh` – shell doctor that verifies the service responds with a state directory and numeric counts.

Ensure `jq` is available before running the doctor script.
