-- GRANT ADMINS FULL PERMISSIONS FOR CONTENT MANAGEMENT
-- This migration ensures that users with the 'admin' role can manage all aspects of the curriculum.

-- 1. Courses Management
DROP POLICY IF EXISTS "Admins can manage all courses" ON public.courses;
CREATE POLICY "Admins can manage all courses" ON public.courses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. Modules Management
DROP POLICY IF EXISTS "Admins can manage all modules" ON public.modules;
CREATE POLICY "Admins can manage all modules" ON public.modules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 3. Lessons Management
DROP POLICY IF EXISTS "Admins can manage all lessons" ON public.lessons;
CREATE POLICY "Admins can manage all lessons" ON public.lessons
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. Quizzes Management
DROP POLICY IF EXISTS "Admins can manage all quizzes" ON public.quizzes;
CREATE POLICY "Admins can manage all quizzes" ON public.quizzes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. Quiz Questions Management
DROP POLICY IF EXISTS "Admins can manage all quiz questions" ON public.quiz_questions;
CREATE POLICY "Admins can manage all quiz questions" ON public.quiz_questions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 6. Quiz Options Management
DROP POLICY IF EXISTS "Admins can manage all quiz options" ON public.quiz_options;
CREATE POLICY "Admins can manage all quiz options" ON public.quiz_options
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 7. Certificate Management
DROP POLICY IF EXISTS "Admins can manage all certificates" ON public.certificates;
CREATE POLICY "Admins can manage all certificates" ON public.certificates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
