-- Fix Lessons RLS to allow prospective students to see the curriculum
-- (titles and structure) before enrolling.

-- 1. Drop the restrictive policy if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enrolled students can read lessons' AND tablename = 'lessons') THEN
        DROP POLICY "Enrolled students can read lessons" ON public.lessons;
    END IF;
END $$;

-- 2. Create or Replace the more open policy for SELECT
-- Anyone can see the list of lessons in a course
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can see lesson titles' AND tablename = 'lessons') THEN
        CREATE POLICY "Anyone can see lesson titles" ON public.lessons
          FOR SELECT
          USING (true);
    END IF;
END $$;

-- 3. Reset ratings for courses that have no reviews
-- (Fixes existing mock data showing 5.0 by default)
UPDATE public.courses
SET rating = 0
WHERE reviews = 0 OR reviews IS NULL;

-- Note: We still protect the actual video content by checking enrollment
-- in the application layer (Learning Screen), or by splitting sensitive
-- data if needed. For now, this fixes the "0 Lessons" display on Course Detail.
