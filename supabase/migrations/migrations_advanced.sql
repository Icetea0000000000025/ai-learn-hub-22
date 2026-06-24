-- Advanced LMS Features Migration

-- 1. Update Quizzes Table with more config
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS time_limit INTEGER DEFAULT 0; -- in minutes, 0 for unlimited
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT false;
-- attempts_allowed already exists from week3 migration

-- 2. Update Quiz Questions for more types
-- We'll use the existing question_type column: multiple_choice, multi_select, true_false, short_answer, matching
-- Note: UI needs to support rendering these.

-- 3. Fix Module RLS Policies (Ensure creators can manage their modules)
DROP POLICY IF EXISTS "Creators can insert modules" ON public.modules;
CREATE POLICY "Creators can insert modules" ON public.modules FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.courses 
    WHERE id = course_id AND creator_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Creators can update modules" ON public.modules;
CREATE POLICY "Creators can update modules" ON public.modules FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.courses 
    WHERE id = course_id AND creator_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Creators can delete modules" ON public.modules;
CREATE POLICY "Creators can delete modules" ON public.modules FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.courses 
    WHERE id = course_id AND creator_id = auth.uid()
  ));

-- 4. Ensure Lesson RLS matches (allowing module_id assignment)
DROP POLICY IF EXISTS "Creators can manage lessons" ON public.lessons;
CREATE POLICY "Creators can manage lessons" ON public.lessons FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.courses 
    WHERE id = course_id AND creator_id = auth.uid()
  ));

-- 5. Student Progress Tracking for Analytics
-- (Already have lesson_progress, but let's ensure we can count completions)
