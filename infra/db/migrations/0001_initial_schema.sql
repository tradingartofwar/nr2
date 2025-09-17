BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  name TEXT NOT NULL,
  purpose TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  phase TEXT NOT NULL DEFAULT 'intake',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE room_members (
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  display_name TEXT,
  headline TEXT,
  data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE problem_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  content_json JSONB NOT NULL,
  evidence_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  anonymity BOOLEAN NOT NULL DEFAULT TRUE,
  state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'submitted', 'locked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE problem_synthesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  version INT NOT NULL,
  clusters_json JSONB NOT NULL,
  definitions_json JSONB NOT NULL,
  assumptions_json JSONB NOT NULL,
  unknowns_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, version)
);

CREATE TABLE synthesis_trace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  job TEXT NOT NULL,
  version INT,
  input_snapshot JSONB NOT NULL,
  output_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE clarification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES problem_submissions(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  response JSONB NOT NULL DEFAULT '{}'::jsonb,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'sent', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_room_members_user ON room_members (user_id);
CREATE INDEX idx_people_room ON people (room_id);
CREATE INDEX idx_problem_submissions_room ON problem_submissions (room_id);
CREATE INDEX idx_problem_synthesis_room ON problem_synthesis (room_id);
CREATE INDEX idx_synthesis_trace_room ON synthesis_trace (room_id);
CREATE INDEX idx_clarification_requests_submission ON clarification_requests (submission_id);

COMMIT;
