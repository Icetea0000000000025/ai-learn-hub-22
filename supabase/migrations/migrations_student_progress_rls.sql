-- STUDENT PROGRESS ACCESS POLICIES
-- This script ensures course creators and admins can view student progress and quiz attempts

-- 1. Lesson Progress: RLS
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own progress" ON public.lesson_progress;
CREATE POLICY "Users can manage own progress" ON public.lesson_progress
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and creators can view progress" ON public.lesson_progress;
CREATE POLICY "Admins and creators can view progress" ON public.lesson_progress
  FOR SELECT
  TO authenticated
  USING (
    public.check_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = course_id AND creator_id = auth.uid()
    )
  );

-- 2. Quiz Attempts: RLS
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see own attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users and creators can see attempts" ON public.quiz_attempts;
CREATE POLICY "Users and creators can see attempts" ON public.quiz_attempts
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.check_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.quizzes q
      JOIN public.lessons l ON l.id = q.lesson_id
      JOIN public.courses c ON c.id = l.course_id
      WHERE q.id = quiz_id AND c.creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create attempts" ON public.quiz_attempts;
CREATE POLICY "Users can create attempts" ON public.quiz_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
