BEGIN;

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE problem_submissions ADD COLUMN IF NOT EXISTS owner_id UUID;

UPDATE rooms SET owner_id = created_by WHERE owner_id IS NULL;
UPDATE problem_submissions AS ps
SET owner_id = p.user_id
FROM people AS p
WHERE ps.owner_id IS NULL
  AND p.id = ps.author_id;

ALTER TABLE rooms ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE problem_submissions ALTER COLUMN owner_id SET NOT NULL;

ALTER TABLE rooms ALTER COLUMN owner_id SET DEFAULT auth.uid();
ALTER TABLE problem_submissions ALTER COLUMN owner_id SET DEFAULT auth.uid();

DROP POLICY IF EXISTS rooms_owner_rw ON rooms;
CREATE POLICY rooms_owner_rw ON rooms
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS problem_submissions_owner_rw ON problem_submissions;
CREATE POLICY problem_submissions_owner_rw ON problem_submissions
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

COMMIT;
