-- FIX LESSON PROGRESS UNIQUE CONSTRAINT
-- This is required for the upsert logic to work correctly

-- 1. Ensure no duplicates exist before adding constraint (keeps only newest)
DELETE FROM public.lesson_progress a
USING public.lesson_progress b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.lesson_id = b.lesson_id;

-- 2. Add the unique constraint
ALTER TABLE public.lesson_progress
DROP CONSTRAINT IF EXISTS lesson_progress_user_lesson_unique;

ALTER TABLE public.lesson_progress
ADD CONSTRAINT lesson_progress_user_lesson_unique UNIQUE (user_id, lesson_id);

-- 3. Ensure RLS is active and correct
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own progress" ON public.lesson_progress;
CREATE POLICY "Users can manage own progress" ON public.lesson_progress
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
