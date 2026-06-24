-- Fix Forbidden (403) for Quiz Creation
-- Allow course creators to insert/update/delete quizzes for their own courses

-- 1. Quizzes: Allow INSERT for creators
DROP POLICY IF EXISTS "Creators can manage quizzes" ON public.quizzes;
CREATE POLICY "Creators can manage quizzes" ON public.quizzes
  FOR ALL -- Includes INSERT, UPDATE, DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      WHERE l.id = lesson_id AND c.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      WHERE l.id = lesson_id AND c.creator_id = auth.uid()
    )
  );

-- 2. Quiz Questions: Allow creators full access
DROP POLICY IF EXISTS "Creators can manage questions" ON public.quiz_questions;
CREATE POLICY "Creators can manage questions" ON public.quiz_questions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      JOIN public.lessons l ON l.id = q.lesson_id
      JOIN public.courses c ON c.id = l.course_id
      WHERE q.id = quiz_id AND c.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      JOIN public.lessons l ON l.id = q.lesson_id
      JOIN public.courses c ON c.id = l.course_id
      WHERE q.id = quiz_id AND c.creator_id = auth.uid()
    )
  );

-- 3. Quiz Options: Allow creators full access
DROP POLICY IF EXISTS "Creators can manage options" ON public.quiz_options;
CREATE POLICY "Creators can manage options" ON public.quiz_options
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_questions qq
      JOIN public.quizzes q ON q.id = qq.quiz_id
      JOIN public.lessons l ON l.id = q.lesson_id
      JOIN public.courses c ON c.id = l.course_id
      WHERE qq.id = question_id AND c.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_questions qq
      JOIN public.quizzes q ON q.id = qq.quiz_id
      JOIN public.lessons l ON l.id = q.lesson_id
      JOIN public.courses c ON c.id = l.course_id
      WHERE qq.id = question_id AND c.creator_id = auth.uid()
    )
  );
