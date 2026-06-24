-- FIX: Allow Creators to manage their own courses
-- This resolves the RLS violation when creating a course draft if the Service Role Key is missing.

-- 1. Ensure RLS is enabled (should be already, but being explicit)
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- 2. Allow creators to INSERT their own courses
-- Requirement: User must be authenticated, creator_id must match their UID, and they must have the 'creator' or 'admin' role.
DROP POLICY IF EXISTS "Creators can insert own courses" ON public.courses;
CREATE POLICY "Creators can insert own courses" ON public.courses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = creator_id AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (role = 'creator' OR role = 'admin')
    )
  );

-- 3. Allow creators to UPDATE their own courses
DROP POLICY IF EXISTS "Creators can update own courses" ON public.courses;
CREATE POLICY "Creators can update own courses" ON public.courses
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = creator_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    auth.uid() = creator_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. Allow creators to DELETE their own courses
DROP POLICY IF EXISTS "Creators can delete own courses" ON public.courses;
CREATE POLICY "Creators can delete own courses" ON public.courses
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = creator_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
