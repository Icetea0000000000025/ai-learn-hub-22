-- Harden Lessons RLS to prevent unauthorized access
-- This ensures that even with a direct link, data is only returned if the user is authorized.

-- 1. Drop the existing permissive policy
DROP POLICY IF EXISTS "Anyone can see lesson titles" ON public.lessons;

-- 2. Create a refined policy for SELECT
CREATE POLICY "Authorized access to lessons" ON public.lessons
  FOR SELECT
  USING (
    -- Case 1: Admins can see everything
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR
    -- Case 2: The course creator can see their own lessons
    auth.uid() = (SELECT creator_id FROM public.courses WHERE id = lessons.course_id)
    OR
    -- Case 3: Enrolled students can see lessons for their course
    EXISTS (
      SELECT 1 FROM public.enrollments 
      WHERE user_id = auth.uid() AND course_id = lessons.course_id
    )
    OR
    -- Case 4: Free Preview lessons are accessible to LOGGED-IN users
    -- If you want them accessible to anyone, remove the auth.uid() IS NOT NULL check.
    -- However, per security requirements, we'll require login even for previews.
    (is_preview = true AND auth.uid() IS NOT NULL)
  );

-- Note: To keep the curriculum visible on the Course Detail page for non-enrolled users,
-- we usually need a View or a policy that allows selecting only metadata.
-- Since Supabase RLS is row-level, this policy will block non-enrolled/non-logged-in users
-- from seeing the lesson list on the Course Detail page.
-- 
-- If we want the curriculum to stay visible (titles only), we should use a VIEW.
