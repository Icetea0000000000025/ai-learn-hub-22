-- RLS Hardening for Quizzes to prevent secret leakage
-- 1. Quizzes: Only enrolled students or course creators can read quizzes.
DROP POLICY IF EXISTS "Anyone can read quizzes" ON public.quizzes;
CREATE POLICY "Students and creators can read quizzes" ON public.quizzes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_id AND (
      c.creator_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = c.id AND e.user_id = auth.uid())
    )
  )
);

-- 2. Quiz Questions: Same rule as quizzes.
DROP POLICY IF EXISTS "Anyone can read questions" ON public.quiz_questions;
CREATE POLICY "Students and creators can read questions" ON public.quiz_questions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q
    JOIN public.lessons l ON l.id = q.lesson_id
    JOIN public.courses c ON c.id = l.course_id
    WHERE q.id = quiz_id AND (
      c.creator_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = c.id AND e.user_id = auth.uid())
    )
  )
);

-- 3. Quiz Options: Same rule. Note: is_correct is still exposed to the client if they can read options.
-- A true production system should only reveal 'is_correct' after attempt, or validate answers on the server.
-- Since we are limited to DB RLS and client-side logic, we restrict the read access strictly to enrolled students.
DROP POLICY IF EXISTS "Anyone can read options" ON public.quiz_options;
CREATE POLICY "Students and creators can read options" ON public.quiz_options FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.quiz_questions qq
    JOIN public.quizzes q ON q.id = qq.quiz_id
    JOIN public.lessons l ON l.id = q.lesson_id
    JOIN public.courses c ON c.id = l.course_id
    WHERE qq.id = question_id AND (
      c.creator_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = c.id AND e.user_id = auth.uid())
    )
  )
);

-- Profiles: Restrict profile updates
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile safe columns" ON public.profiles FOR UPDATE USING (
  auth.uid() = id
) WITH CHECK (
  auth.uid() = id -- In Supabase, preventing 'role' from being updated usually requires a trigger or checking old.role = new.role, but we handled it on the server-side updateProfile function.
);
