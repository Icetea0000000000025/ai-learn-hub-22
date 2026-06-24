-- Clean up Certificate RLS for public verification
-- This ensures that anyone can verify a certificate by its ID without authentication

-- 1. Drop any previous potentially corrupt or restrictive policies
DROP POLICY IF EXISTS "Public can verify certificates" ON public.certificates;
DROP POLICY IF EXISTS "Public\ncan\nverify\ncertificates" ON public.certificates;

-- 2. Create a clean public SELECT policy
CREATE POLICY "Anyone can verify certificates by ID" 
  ON public.certificates 
  FOR SELECT 
  USING (true);

-- 3. Ensure profiles are also publicly readable (already done in other migrations, but for safety)
-- This is needed because fetchCertificate joins with profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles 
  FOR SELECT 
  USING (true);

-- 4. Ensure courses are publicly readable (basic info)
DROP POLICY IF EXISTS "Anyone can see course basics" ON public.courses;
CREATE POLICY "Anyone can see course basics" ON public.courses 
  FOR SELECT 
  USING (true);
