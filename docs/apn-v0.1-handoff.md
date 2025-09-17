# APN v0.1 — Full Handoff Package for GPT-5 Codex

## 0. Purpose & Non-Goals

**Purpose**

Enable AI to gather individual perspectives, synthesize a shared problem map, and propose introductions/circles and micro-experiments — scoped to private rooms with clear explainability and admin visibility.

**Non-Goals (v0.1)**

- Real-time collaborative editing (basic realtime not required yet)
- Cross-org federation (future "adjacent/open" discovery modes)
- Heavy analytics pipelines; start with lightweight metrics

## 1. Condensed User Stories

1. Participants complete a private intake thread (problem, factors, constraints, evidence), optionally anonymous, and submit.
2. System runs Synthesis v1 → clusters perspectives; drafts working definitions; flags assumptions/unknowns.
3. Participants review Synthesis v1, see alignment/conflicts, clarify points; system runs Synthesis v2 → hypotheses + protocol cards.
4. Admin monitors progress, quality, diversity; nudges pending users; advances phase; optionally spins micro-circles.
5. Matching provides explainable pair suggestions and circle proposals (optional to use anytime).

## 2. Architecture Overview

- **Next.js 14** (App Router, TypeScript, Tailwind, shadcn/ui)
  - **API**: Fastify (TypeScript, ESM) + Zod + OpenAPI
    - **Database**: Postgres (Supabase) + pgvector + RLS
      - Storage (Supabase) for artifacts
      - Redis (Upstash) for BullMQ jobs

### Background Jobs

`synth_v1`, `synth_v2`, `nudge_pending`, `compute_matches`, `circle_formation`

### Principles

Solo-first; modular; explainable; room-scoped; mobile-friendly; accessible (WCAG AA+).

## 3. Data Model (SQL Sketch)

All tables include `id uuid primary key default gen_random_uuid()` and `created_at timestamptz default now()` unless noted.

```sql
-- ROOMS & MEMBERSHIP
create table rooms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  name text not null,
  purpose text,
  settings jsonb default '{}'::jsonb,
  created_by uuid not null,
  created_at timestamptz default now()
);

create table room_members (
  room_id uuid references rooms(id) on delete cascade,
  user_id uuid not null,
  role text check (role in ('owner','admin','member','viewer')) default 'member',
  joined_at timestamptz default now(),
  primary key (room_id, user_id)
);

-- PEOPLE & FACETS (profile per room)
create table people (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  user_id uuid not null,
  display_name text,
  headline text,
  data_json jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);
-- data_json example: {
--  skills:{items:["DoE","sensory"],visibility:"room-only"},
--  methods:{items:["rapid prototyping"],visibility:"room-only"},
--  problems:{items:["UPFs dependency"],visibility:"room-only"},
--  interests:{items:["cycling"],visibility:"group-only"},
--  constraints:{licensure:["BCBA-no-nutrition"],visibility:"room-only"}
-- }

-- SUBMISSIONS & SYNTHESIS
create table problem_submissions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  author_id uuid not null, -- references people.id
  version int not null default 1,
  content_json jsonb not null,
  evidence_json jsonb default '[]'::jsonb, -- [{url, note}]
  anonymity boolean not null default true,
  state text check (state in ('draft','submitted','locked')) not null default 'draft',
  created_at timestamptz default now()
);

create table problem_synthesis (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  version int not null,
  clusters_json jsonb not null,        -- clustered themes
  definitions_json jsonb not null,     -- working problem statements
  assumptions_json jsonb not null,
  unknowns_json jsonb not null,
  created_at timestamptz default now()
);

create table synthesis_trace (
  id uuid primary key default gen_random_uuid(),
```

(continue policies and functions for RLS)

```sql
alter table rooms enable row level security;
alter table room_members enable row level security;
-- repeat for people, problem_submissions, problem_synthesis, ...

create or replace function is_room_member(rid uuid)
returns boolean language sql stable as $$
  select exists(select 1 from room_members where room_id = rid and user_id = auth.uid());
$$;

create policy "rooms:select" on rooms for select using (is_room_member(id));
create policy "members:select" on room_members for select using (is_room_member(room_id));

-- child tables: use/with check pair
create policy "submissions:rw" on problem_submissions
for all using (is_room_member(room_id)) with check (is_room_member(room_id));
-- repeat for other tables
```

## 4. API Surface (Fastify + Zod)

- Auth: Supabase client session; server validates JWT.

### Rooms

- `POST /rooms {name,purpose,settings} → room`
- `POST /rooms/:id/members {user_id, role} → upsert`
- `GET /rooms/:id/progress → {total, submitted, pending_by_role}` (no content)

### People

- `GET /rooms/:id/me → profile + visibility`
- `POST /rooms/:id/people → upsert data_json` (per-facet visibility)

### Submissions

- `POST /rooms/:id/submissions → autosave draft {content_json, evidence_json, anonymity}`
- `POST /rooms/:id/submissions/submit → lock v1`
- `GET /rooms/:id/synthesis?version=v1|v2 → map` (respect anonymity)
- `POST /rooms/:id/clarify → targeted clarifications (v2)`

### Matching & Circles

- `POST /rooms/:id/match/pairs {person_id,k} → ranked matches + explanation`
- `POST /rooms/:id/match/circle {goal,k} → circle proposal (members+why+agenda)`
- `POST /rooms/:id/intros {a_person_id,b_person_id} → stores intro artifact`

### Artifacts & Events

- `GET /rooms/:id/artifacts → signed URLs from Supabase Storage`
- `POST /rooms/:id/events → optional client analytics/audit`

### Admin

- `POST /rooms/:id/synthesize?v=1|v=2 → run jobs`
- `POST /rooms/:id/advance {phase} → update room phase`

Generate OpenAPI via `zod-to-openapi`. Standard error envelope: `{ok:false,error:{code,msg,details}}`.

## 5. Jobs (BullMQ on Upstash Redis)

- `synthesize_v1(room_id)`: cluster submissions → Problem Map (clusters, definitions, assumptions, unknowns) + synthesis_trace
- `synthesize_v2(room_id)`: merge clarifications → Hypothesis Bank + Protocol Cards (objective, steps, measures, safety)
- `nudge_pending(room_id)`: notify non-submitters (rate-limited)
- `compute_matches(room_id)`: precompute top-k pairs (optional cache)
- `circle_formation(room_id)`: propose circles w/ diversity constraints

### Chunking/Embedding

1–2k token chunks; 10–15% overlap; store provenance in `documents.meta` (url, title, dates).

## 6. Matching — Scoring & Explainability

```
score = α·Relevance + β·Complementarity + γ·DiversityGain + δ·Practicality – penalties
```

- **Relevance**: sim(Problems↔Skills/Methods) + sim(Problems↔Problems)
- **Complementarity**: methods addressing counterpart’s needs/constraints
- **DiversityGain**: embedding spread within proposed circle
- **Practicality**: availability overlap, openness, timezone
- **Penalties**: repeat pairs, same-org bias, overloaded participants

**Explanation JSON Example**

```json
{
  "relevance": {"pairs": [["UPFs dependency","sensory analysis"]], "score": 0.63},
  "complementarity": {"pairs": [["DoE","clinic pathway design"]], "score": 0.29},
  "diversity_gain": 0.18,
  "practicality": {"availability_overlap": "Tue PM"}
}
```

## 7. UI/UX Specification

Design principles: clarity, elegant restraint, explainability-first, mobile-ready, accessible.

### Core Screens

- **Room Dashboard**: phase chip; KPI tiles (submissions, clarity, hypotheses, protocols); role-stacked progress; CTA strip.
- **Intake Thread**: two-pane (private chat ⇄ structured fields); anonymity toggle; autosave; clarity assist chips.
- **Synthesis View**: cluster graph (Cytoscape/VisX); working definitions; assumptions/unknowns; personal alignment card.
- **Matches & Circles**: intro cards with "why match"; circle table with Diversity Index + role balance; agenda drawer.
- **Admin Mission Control**: submission funnel; problem map; assumption heatmap; circle health (PDI, repeat-pair rate); actions (nudge, clarify, advance, add outsider).

### Visuals

Tailwind + shadcn/ui; Inter or Satoshi; lucid icons; micro-motion 150–200ms; WCAG AA+.

### Modular Front-End Structure (Monorepo)

```
/apps
  /web        # Next.js App Router
  /api        # Fastify TS
/packages
  /ui         # tokens & primitives
  /features   # intake, synthesis, match, admin (hooks + state)
  /types      # zod schemas shared
  /agents     # synthesis/match logic
/infra
  /db         # migrations (Drizzle/Prisma)
  /ops        # vercel, supabase cfg
```

## 8. Privacy & Consent Mechanics

- Per-facet visibility in `people.data_json` (`invisible | room-only | group-only | public`).
- Submission anonymity default `true`; identity revealed only on mutual opt-in or duty-of-care admin override.
- Scoped discovery via `rooms.settings.discovery`: `"closed" | "adjacent_only" | "open"`.
- Audit in events: viewed/exported/matched/introduced.
- Withdraw before synthesis; post-synthesis, content remains in aggregate unless removed by admin.

## 9. Prompts (Initial)

### Intake Coaching (chat side-panel)

> "Write the clearest version of the problem you believe we should solve. Then list contributing factors (policy, family load, sensory, availability, training), constraints, prior attempts & outcomes, and 1–3 ways we could measure progress. Add links if you have them."

### Synthesis v1

> "Cluster N submissions into K themes. For each cluster: summarize claim(s); extract assumptions; cite evidence; list unknowns. Propose 3–5 working problem definitions that are testable and non-overlapping."

### Synthesis v2

> "Integrate clarifications. Rank decision levers by impact×feasibility. Produce 2–3 testable hypotheses per top lever and draft protocol cards (objective, steps, measures, safety/ethics)."

### Intro Writer

> "Draft a concise, warm intro between A and B. Use A.problems, A.methods, B.skills, constraints. Include one specific ‘why now’ hook. End with one starter question."

### Circle Composer

> "Form a 4–5 person circle maximizing complementary methods around goal: {goal}. Enforce role diversity; include one unconventional perspective. Return members, rationale, 10-minute agenda, one artifact."

## 10. Deployment & Environment

- **Vercel** (web) + **Supabase** (DB/Auth/Storage/pgvector) + **Upstash Redis** (queues)
- **Environment Variables**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server only)
  - `DATABASE_URL`
  - `REDIS_URL`
  - `OPENAI_API_KEY`
- **Ports (local)**: web 3000, api 4000; avoid 5000 conflicts; ESM everywhere.

## 11. Seed Data & Fixtures

- **Room**: “BCBA Diet Initiative”
- **People (10)**: roles balanced (BCBA, nutritionist, OT, parent advocate, method expert, integrator, etc.)
- **Submissions (10)**: varied assumptions & constraints
- **Synthesis v1** → 4–6 clusters; v2 → 6 hypotheses, 3 protocol cards
- **Matches**: 12 pair suggestions with explanations; 2 proposed circles

## 12. Acceptance Criteria (v0.1)

- Members submit privately; dashboard shows progress (no content leakage).
- Synthesis v1 returns clusters, assumptions, unknowns, and 3–5 working definitions.
- Personal alignment view highlights cluster overlap/conflict.
- Synthesis v2 returns hypotheses and protocol cards.
- Matching returns pairs with explanations; circles show diversity metrics.
- Admin dashboard renders progress, map, heatmap; actions: nudge, advance phase.
- RLS blocks non-members; anonymous content never reveals identity.
- Lighthouse accessibility ≥ 95; keyboard navigation passes.

## 13. Build Order (Sprint Plan)

1. **Day 1–2**: Repo + env; migrations; RLS; Supabase auth; seed room & members
2. **Day 3–4**: Intake thread UI + endpoints (draft→submit); progress API; artifacts bucket
3. **Day 5–6**: Synthesis v1 job + view (clusters/definitions/assumptions/unknowns)
4. **Day 7–8**: Clarify flow + Synthesis v2 (hypotheses/protocol cards)
5. **Day 9–10**: Matching endpoints + intro cards; circles (read-only)
6. **Day 11–12**: Admin Mission Control (progress + problem map + actions)
7. **Day 13–14**: Polish, tests, deploy, demo script

## 14. Quality Gates

- TypeScript strict
- ESLint + Prettier
- Husky pre-commit (lint, typecheck)
- Vitest unit; Playwright smoke (intake submit, synth v1 render, synth v2 render)
- Error boundaries; Pino logs; basic metrics (jobs queued/failed; token usage)

## 15. Notes & Gotchas

- Respect anonymity in all GETs; never join to users table when rendering synthesis map.
- Always filter embeddings/search by `room_id`.
- Store provenance (urls, dates) for evidence; citations must appear in briefs.
- Keep components ≤ 200 lines; split logic hooks from view; lazy-load graph viz.

## 16. Hand-Off Checklist

- [ ] Migrations applied and seed data verified
- [ ] Supabase policies audited for anonymity
- [ ] Queue workers deployed with monitoring
- [ ] AI prompts validated against sample data
- [ ] Accessibility audit >= 95 Lighthouse score
- [ ] Demo script rehearsed with admin + participant flows

## Appendices

### Appendix A — Example Zod Schemas (snippets)

```ts
export const SubmissionContent = z.object({
  problem: z.string().min(20),
  factors: z.array(z.string()).min(1),
  constraints: z.array(z.string()).optional(),
  measures: z.array(z.string()).min(1),
});

export const SubmissionDraft = z.object({
  content_json: SubmissionContent,
  evidence_json: z.array(z.object({url: z.string().url(), note: z.string().optional()})).optional(),
  anonymity: z.boolean().default(true),
});
```

### Appendix B — Storage Policy (concept)

Bucket: `artifacts`

Path: `artifacts/{room_id}/{artifact_id}/{filename}`

Signed URL; server verifies requester membership before signing.

### Appendix C — SIx Branding Hooks

- Provide `logo.svg`; place at top-left; monochrome variant for dark mode.
- Tokens & theming via CSS variables; no heavy imagery beyond login splash.
