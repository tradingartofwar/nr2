# Autonomous Problem Networking (APN) v0.1

This repository contains the full handoff package for APN v0.1, covering product intent, architecture, data model, API surface, jobs, matching heuristics, UI/UX, privacy controls, prompts, deployment, seed data, acceptance criteria, sprint plan, and checklists.

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Duplicate `.env.example` into `.env` (or export the variables in your shell) and provide the Supabase, Postgres, Redis, and OpenAI credentials for your deployment.

### 3. Database migrations and seed data

Apply the SQL migrations under `infra/db/migrations` followed by the seed fixture in `infra/db/seed/0001_bcba_diet_initiative.sql`. The scripts assume the default Supabase extensions (including `pgcrypto` for UUID generation) are available.

### 4. Run the API locally

```bash
pnpm --filter @apn/api dev
```

The Fastify server will start on port `4000` (configurable via `API_PORT`). A health check is exposed at `GET /healthz`.

## Repository layout

- `apps/api` — Fastify + Supabase service with authentication middleware and health check route.
- `packages/types` — Shared TypeScript primitives for rooms, members, people, and submissions.
- `infra/db` — SQL migrations establishing the APN schema, RLS policies, and BCBA Diet Initiative seed data.
- `docs` — Product specification and architectural guidance for APN v0.1.

Review [`docs/apn-v0.1-handoff.md`](docs/apn-v0.1-handoff.md) for the complete specification and sprint roadmap.
