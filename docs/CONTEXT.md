# Neural Resonance — Working Context

This note captures the operational decisions, gaps, and next actions distilled from the broader Neural Resonance docs and the repo today. It is meant to be a quick bring-up for anyone joining the effort without duplicating the source documents.

## Mission & North Star
- Build a consent-first cockpit that surfaces strengths/challenges, maps overlaps, and only forms connections with dual opt-in.
- Keep the pilot scope tight: three panels (Nodes, Heatmap, Overlaps) that prove resonance can be designed with minimal but high-signal flows.

## Current System Snapshot
- **Modules**: Node registry; input/update flows; mapping & clustering; feedback & matching; consent & connection; append-only history/memory (JSONL); visualization dashboard.
- **Team loops**: Helios (integration), Prism (UI), Forge (backend/data), Aurora (AI logic), Polaris/Lumen/Mirror/Pulse/Flare/Storyteller (alignment, UX, QA, urgency, narrative).
- **Data**:
  - Node: id, cohortId, displayName, optional email, strengths/challenges/projects/interests/values/fears/pride arrays, consent flags, timestamps.
  - Suggestion/Edge: id, nodeId, otherId, cohortId, state (ghost → admin_approved → solid), rationale_public string, score number, timestamps, consent gating.
- **Pilot guardrails**: sensitive fields anonymised by default, append-only logs, cohort policy file, changelog discipline.

## Pain Points Observed
- Seeder confusion: unclear whether state comes from backend or an external script; API-based seeding vs file writes.
- State directory ambiguity: components reading different paths or resetting on boot.
- Suggestions disappearing: `state.suggestions.json` wiped or overwritten at startup, leaving admin empty.
- Frontend/backend mismatch: admin served from different origins (`:5000` vs `:3000`), socket upgrade errors when WS isn’t available.

## Locked Decisions
1. **Single source of truth for state path** — use `NR_STATE_DIR` (e.g. `C:\NR\backend\state`) and resolve all reads/writes through it; no `process.cwd()` guesswork.
2. **Deterministic, file-first seeding** — idempotent seeder writing directly to `state.*.json` with valid suggestions (`rationale_public`, numeric `score`, timestamps). API-based seeding remains optional.
3. **No auto-reset on boot** — the pilot must not silently clear `state.suggestions.json`. Provide a manual reset route/script if needed.
4. **Admin runs against backend origin** — prefer `http://localhost:5000/admin?cohort=demo`; allow fetch-only if sockets are unavailable.
5. **Safety rails** — validate `/node` payloads, add `policy.json` (feature flags), and maintain append-only `events.log.jsonl` for audit.

## Minimal Work Plan (1 Sprint)
### A. Hardening (Forge + Prism)
- Honour `NR_STATE_DIR`, fail fast if missing.
- Remove implicit resets; provide `/admin/reset` guarded/manual.
- Allow admin to degrade gracefully if websockets fail.

### B. Deterministic Seeding (Forge)
- `scripts/seed-demo.cjs` creates nodes + ghost suggestions.
- Add npm scripts such as `seed:demo` and `admin` to simplify onboarding.

### C. Policy & Consent (Polaris + Governance)
- Introduce `backend/policy.json` (flags like `allowEmail`, `sensitiveFields`, `defaultAlias`).
- Enforce policy on read/write paths.

### D. Observability (Mirror + Pulse)
- `/status` reports `stateDir` and counts for nodes/suggestions/consents.
- Emit a daily digest summarising counts by suggestion state.

### E. Demo Readiness (Storyteller + Lumen)
- Ensure admin loads with pending suggestions.
- Provide a “Demo Reset” that clears only UI state, not persisted files.

## Kickoff Checklist (Fresh Thread)
1. Confirm `NR_STATE_DIR` is set and exposed by `/status`.
2. Run `npm run seed:demo` and verify counts (nodes = N, suggestions = N × K ghost).
3. Start backend (`npm run dev`) and admin (`npm run admin`), confirm cohorts load.
4. Validate consent flows: ghost → admin_approved → solid only after dual opt-in.

## Runtime & Layout (Current Repo)
```
C:\NR
├─ backend
│  ├─ index.cjs          # API entry
│  ├─ routes/            # nodes, suggestions, consent, admin, feedback, reset
│  ├─ lib/               # store, events, util, email helpers
│  └─ state/             # JSON data: nodes, suggestions, consents, etc.
├─ frontend
│  ├─ index.html, app.js, style.css
│  └─ admin.html, admin.js
└─ docs/ …               # architecture, capture, storyteller, changelog
```

## Observability & Guardrails
- `/status` must expose heartbeat plus node/suggestion/consent counts and `stateDir`.
- All writes append to `events.log.jsonl` for replay/audit.
- Pilot performance: target ≤ 2s clustering with ~10–50 nodes.
- Provide manual reset tooling; never auto-wipe on boot.

---
This context should travel with the repo so new collaborators can ramp quickly. If further automation (seeding scripts, admin launchers) lands, add them adjacent to this note.
