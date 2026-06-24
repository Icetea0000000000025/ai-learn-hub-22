-- Create a public view for course curriculum to allow prospective students
-- to see the titles and structure without having access to video content.

CREATE OR REPLACE VIEW public.course_curriculum AS
SELECT 
  id,
  course_id,
  module_id,
  title,
  order_index,
  content_type,
  is_preview,
  created_at
FROM public.lessons;

-- Allow everyone to read the curriculum view
GRANT SELECT ON public.course_curriculum TO anon, authenticated;

-- Now update the RLS on the main lessons table to be very strict
DROP POLICY IF EXISTS "Authorized access to lessons" ON public.lessons;
CREATE POLICY "Authorized access to lessons" ON public.lessons
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR
    auth.uid() = (SELECT creator_id FROM public.courses WHERE id = lessons.course_id)
    OR
    EXISTS (
      SELECT 1 FROM public.enrollments 
      WHERE user_id = auth.uid() AND course_id = lessons.course_id
    )
    OR
    (is_preview = true AND auth.uid() IS NOT NULL)
  );
