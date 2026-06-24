-- Fix Reviews and Quiz Attempts foreign keys to point to profiles
-- This enables easier joins in the public schema

-- 1. Fix Reviews FK
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;
ALTER TABLE public.reviews 
  ADD CONSTRAINT reviews_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

-- 2. Fix Quiz Attempts FK
ALTER TABLE public.quiz_attempts DROP CONSTRAINT IF EXISTS quiz_attempts_user_id_fkey;
ALTER TABLE public.quiz_attempts 
  ADD CONSTRAINT quiz_attempts_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

-- 3. Add public SELECT policy for profiles
-- This ensures everyone can see student names on reviews and in the dashboard
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles 
  FOR SELECT 
  USING (true);

-- 4. Ensure Reviews are also viewable by everyone (redundant but safe)
DROP POLICY IF EXISTS "Anyone can read reviews" ON public.reviews;
CREATE POLICY "Anyone can read reviews" ON public.reviews 
  FOR SELECT 
  USING (true);
