-- Ensure learner counts are visible to everyone
-- This fixes the issue where prospective students or creators might see
-- an incorrect count of learners due to RLS restrictions.

DROP POLICY IF EXISTS "Anyone can see enrollment counts" ON public.enrollments;
CREATE POLICY "Anyone can see enrollment counts" ON public.enrollments
  FOR SELECT
  USING (true);

-- This policy allows anyone to read from the enrollments table.
-- Since enrollments don't contain sensitive data (just user_id and course_id),
-- this is safe and ensures that aggregate counts are always accurate.
