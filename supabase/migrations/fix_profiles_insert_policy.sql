-- Allow users to insert their own profile (Fallback for when trigger fails)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);
