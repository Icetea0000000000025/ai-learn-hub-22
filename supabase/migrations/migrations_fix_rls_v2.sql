-- COMPREHENSIVE RLS FIX V2

-- 1. Schema Updates
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Profiles: Allow users to update their own profile (including avatar_url)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 3. Modules: Robust policy for creators
DROP POLICY IF EXISTS "Creators can manage modules" ON public.modules;
CREATE POLICY "Creators can manage modules" ON public.modules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE public.courses.id = public.modules.course_id 
      AND public.courses.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE public.courses.id = public.modules.course_id 
      AND public.courses.creator_id = auth.uid()
    )
  );

-- 3. Lessons: Allow creators to manage their lessons
DROP POLICY IF EXISTS "Creators can manage lessons" ON public.lessons;
CREATE POLICY "Creators can manage lessons" ON public.lessons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE public.courses.id = public.lessons.course_id 
      AND public.courses.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE public.courses.id = public.lessons.course_id 
      AND public.courses.creator_id = auth.uid()
    )
  );

-- 4. Lessons: Ensure students can still read them (keep existing or merge)
DROP POLICY IF EXISTS "Enrolled students can read lessons" ON public.lessons;
CREATE POLICY "Enrolled students can read lessons" ON public.lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE public.courses.id = public.lessons.course_id AND (
        public.courses.creator_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.enrollments WHERE course_id = public.courses.id AND user_id = auth.uid())
      )
    )
  );

-- 5. Storage Buckets (Run these in Supabase Dashboard or via API if possible)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('course-images', 'course-images', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('profile-pictures', 'profile-pictures', true);

-- Storage RLS (Generic example, adjust as needed)
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'course-images' OR bucket_id = 'profile-pictures');
-- CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
