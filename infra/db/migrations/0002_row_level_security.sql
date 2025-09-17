BEGIN;

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_synthesis ENABLE ROW LEVEL SECURITY;
ALTER TABLE synthesis_trace ENABLE ROW LEVEL SECURITY;
ALTER TABLE clarification_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_room_member(p_room_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM room_members
    WHERE room_members.room_id = p_room_id
      AND room_members.user_id = auth.uid()
  );
$$;

CREATE POLICY "rooms_select" ON rooms
  FOR SELECT
  USING (is_room_member(id));

CREATE POLICY "rooms_insert" ON rooms
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "room_members_rw" ON room_members
  FOR ALL
  USING (is_room_member(room_id))
  WITH CHECK (is_room_member(room_id));

CREATE POLICY "people_rw" ON people
  FOR ALL
  USING (is_room_member(room_id))
  WITH CHECK (is_room_member(room_id));

CREATE POLICY "problem_submissions_rw" ON problem_submissions
  FOR ALL
  USING (is_room_member(room_id))
  WITH CHECK (is_room_member(room_id));

CREATE POLICY "problem_synthesis_read" ON problem_synthesis
  FOR SELECT
  USING (is_room_member(room_id));

CREATE POLICY "synthesis_trace_read" ON synthesis_trace
  FOR SELECT
  USING (is_room_member(room_id));

CREATE POLICY "clarification_requests_rw" ON clarification_requests
  FOR ALL
  USING (
    is_room_member(
      (SELECT room_id FROM problem_submissions WHERE id = clarification_requests.submission_id)
    )
  )
  WITH CHECK (
    is_room_member(
      (SELECT room_id FROM problem_submissions WHERE id = clarification_requests.submission_id)
    )
  );

COMMIT;
