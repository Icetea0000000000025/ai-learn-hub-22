-- FINAL FIX FOR MODULES AND PAYMENTS RLS

-- 1. Modules: Allow creators full access to modules of their courses
DROP POLICY IF EXISTS "Creators can manage modules" ON public.modules;
CREATE POLICY "Creators can manage modules" ON public.modules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE id = course_id AND creator_id = auth.uid()
    )
  );

-- 2. Payments: Allow students to insert payment records
DROP POLICY IF EXISTS "Users can create payments" ON public.payments;
CREATE POLICY "Users can create payments" ON public.payments FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 3. Lessons: Ensure anyone can read lessons of a course they are enrolled in OR if it's their course
DROP POLICY IF EXISTS "Enrolled students can read lessons" ON public.lessons;
CREATE POLICY "Enrolled students can read lessons" ON public.lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE id = course_id AND (
        creator_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.enrollments WHERE course_id = public.courses.id AND user_id = auth.uid())
      )
    )
  );

-- 4. Progress Resuming: Track last active lesson
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS last_lesson_id UUID REFERENCES public.lessons(id);
