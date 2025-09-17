BEGIN;

-- Seed room
INSERT INTO rooms (id, project_id, name, purpose, settings, phase, created_by)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'BCBA Diet Initiative',
  'Coordinate specialists around reducing UPF dependency for neurodiverse teens.',
  jsonb_build_object('discovery', 'closed'),
  'intake',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
)
ON CONFLICT (id) DO NOTHING;

-- Seed members
INSERT INTO room_members (room_id, user_id, role, joined_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner', now()),
  ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'admin', now()),
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'admin', now()),
  ('11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'member', now()),
  ('11111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'member', now()),
  ('11111111-1111-1111-1111-111111111111', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'member', now()),
  ('11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999999', 'member', now()),
  ('11111111-1111-1111-1111-111111111111', '12121212-1212-1212-1212-121212121212', 'viewer', now()),
  ('11111111-1111-1111-1111-111111111111', '13131313-1313-1313-1313-131313131313', 'member', now()),
  ('11111111-1111-1111-1111-111111111111', '14141414-1414-1414-1414-141414141414', 'member', now())
ON CONFLICT DO NOTHING;

-- Seed people profiles
INSERT INTO people (id, room_id, user_id, display_name, headline, data_json)
VALUES
  (
    '20111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Maya Chen',
    'BCBA Lead',
    '{"skills":{"items":["behavior plans","family coaching"],"visibility":"room-only"}}'::jsonb
  ),
  (
    '20222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Dr. Luis Ortega',
    'Clinical Nutritionist',
    '{"skills":{"items":["meal plans","sensory-friendly"],"visibility":"room-only"}}'::jsonb
  ),
  (
    '20333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Priya Kapoor',
    'OT & Sensory Specialist',
    '{"skills":{"items":["sensory diets","family coaching"],"visibility":"room-only"}}'::jsonb
  ),
  (
    '20444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'Jared Mills',
    'Parent Advocate',
    '{"problems":{"items":["after-school routines"],"visibility":"group-only"}}'::jsonb
  ),
  (
    '20555555-5555-5555-5555-555555555555',
    '11111111-1111-1111-1111-111111111111',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'Alana Ruiz',
    'Methodologist',
    '{"methods":{"items":["design of experiments"],"visibility":"room-only"}}'::jsonb
  ),
  (
    '20666666-6666-6666-6666-666666666666',
    '11111111-1111-1111-1111-111111111111',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'Noor Al-Fayed',
    'Care Integrator',
    '{"constraints":{"items":["Medicaid billing"],"visibility":"room-only"}}'::jsonb
  ),
  (
    '20777777-7777-7777-7777-777777777777',
    '11111111-1111-1111-1111-111111111111',
    '99999999-9999-9999-9999-999999999999',
    'Gabe Porter',
    'School Liaison',
    '{"availability":{"items":["Tue PM"],"visibility":"group-only"}}'::jsonb
  ),
  (
    '20888888-8888-8888-8888-888888888888',
    '11111111-1111-1111-1111-111111111111',
    '12121212-1212-1212-1212-121212121212',
    'Dr. Elise Tan',
    'Research Fellow',
    '{"interests":{"items":["micro-experiments"],"visibility":"public"}}'::jsonb
  ),
  (
    '20999999-9999-9999-9999-999999999999',
    '11111111-1111-1111-1111-111111111111',
    '13131313-1313-1313-1313-131313131313',
    'Samuel Patel',
    'Community Organizer',
    '{"skills":{"items":["circle design"],"visibility":"room-only"}}'::jsonb
  ),
  (
    '20aaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    '14141414-1414-1414-1414-141414141414',
    'Dr. Wen Zhao',
    'Data Scientist',
    '{"skills":{"items":["analytics"],"visibility":"room-only"}}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- Seed submissions
INSERT INTO problem_submissions (id, room_id, author_id, version, content_json, evidence_json, anonymity, state)
VALUES
  (
    '30111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '20111111-1111-1111-1111-111111111111',
    1,
    '{"problem":"Teens are skipping prepared meals for ultra-processed snacks.","factors":["family schedule","sensory aversion"],"constraints":["insurance"],"measures":["food logs"]}'::jsonb,
    '[{"url":"https://example.org/report","note":"Clinic report"}]'::jsonb,
    TRUE,
    'submitted'
  ),
  (
    '30222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    '20222222-2222-2222-2222-222222222222',
    1,
    '{"problem":"Protein deficit persists despite meal plans.","factors":["prep burden"],"measures":["weekly intake"]}'::jsonb,
    '[]'::jsonb,
    TRUE,
    'submitted'
  ),
  (
    '30333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    '20333333-3333-3333-3333-333333333333',
    1,
    '{"problem":"Students resist novel textures at school.","factors":["sensory load","time pressure"],"measures":["accepted foods"]}'::jsonb,
    '[]'::jsonb,
    TRUE,
    'submitted'
  ),
  (
    '30444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    '20444444-4444-4444-4444-444444444444',
    1,
    '{"problem":"Caregivers lack quick wins to stay motivated.","factors":["fatigue","budget"],"measures":["caregiver confidence"]}'::jsonb,
    '[]'::jsonb,
    FALSE,
    'submitted'
  ),
  (
    '30555555-5555-5555-5555-555555555555',
    '11111111-1111-1111-1111-111111111111',
    '20555555-5555-5555-5555-555555555555',
    1,
    '{"problem":"We lack experiments comparing reinforcement strategies.","factors":["mixed protocols"],"measures":["meal completion"]}'::jsonb,
    '[]'::jsonb,
    TRUE,
    'submitted'
  ),
  (
    '30666666-6666-6666-6666-666666666666',
    '11111111-1111-1111-1111-111111111111',
    '20666666-6666-6666-6666-666666666666',
    1,
    '{"problem":"Billing rules limit multidisciplinary consults.","factors":["licensure"],"measures":["approved sessions"]}'::jsonb,
    '[]'::jsonb,
    TRUE,
    'submitted'
  ),
  (
    '30777777-7777-7777-7777-777777777777',
    '11111111-1111-1111-1111-111111111111',
    '20777777-7777-7777-7777-777777777777',
    1,
    '{"problem":"School cafeteria partners feel under-equipped.","factors":["staff turnover"],"measures":["staff readiness"]}'::jsonb,
    '[]'::jsonb,
    TRUE,
    'submitted'
  ),
  (
    '30888888-8888-8888-8888-888888888888',
    '11111111-1111-1111-1111-111111111111',
    '20888888-8888-8888-8888-888888888888',
    1,
    '{"problem":"Evidence summaries lag behind interventions.","factors":["time"],"measures":["update cadence"]}'::jsonb,
    '[]'::jsonb,
    TRUE,
    'submitted'
  ),
  (
    '30999999-9999-9999-9999-999999999999',
    '11111111-1111-1111-1111-111111111111',
    '20999999-9999-9999-9999-999999999999',
    1,
    '{"problem":"Circles repeat the same perspectives.","factors":["matching inertia"],"measures":["diversity index"]}'::jsonb,
    '[]'::jsonb,
    TRUE,
    'submitted'
  ),
  (
    '30aaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    '20aaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    1,
    '{"problem":"We do not track intervention ROI across cohorts.","factors":["data silo"],"measures":["cost per success"]}'::jsonb,
    '[]'::jsonb,
    TRUE,
    'submitted'
  )
ON CONFLICT (id) DO NOTHING;

-- Seed synthesis artifacts
INSERT INTO problem_synthesis (id, room_id, version, clusters_json, definitions_json, assumptions_json, unknowns_json)
VALUES (
  '40111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  1,
  '{"clusters":[{"label":"Sensory constraints","submissions":["30333333-3333-3333-3333-333333333333"]},{"label":"Caregiver enablement","submissions":["30444444-4444-4444-4444-444444444444"]}]}'::jsonb,
  '{"definitions":["Teens lack sensory-aligned meal routines","Caregivers require rapid reinforcement"]}'::jsonb,
  '{"assumptions":[{"label":"Families can adopt new prep routines"}]}'::jsonb,
  '{"unknowns":[{"label":"Role of school partners"}]}'::jsonb
)
ON CONFLICT (room_id, version) DO NOTHING;

INSERT INTO synthesis_trace (id, room_id, job, version, input_snapshot, output_snapshot)
VALUES (
  '50111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'synth_v1',
  1,
  '{"submission_ids":["30111111-1111-1111-1111-111111111111"]}'::jsonb,
  '{"clusters":2,"definitions":2}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
