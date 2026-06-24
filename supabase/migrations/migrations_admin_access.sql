-- ADMIN ACCESS POLICIES
-- This script ensures admins can see all relevant data for management

-- 1. Profiles: Ensure admins can see all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR id = auth.uid()
  );

-- 2. Enrollments: Ensure admins can see all enrollments
DROP POLICY IF EXISTS "Admins can view all enrollments" ON public.enrollments;
CREATE POLICY "Admins can view all enrollments" ON public.enrollments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = course_id AND creator_id = auth.uid()
    )
  );

-- 3. Payments: Ensure admins can see all payments
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
CREATE POLICY "Admins can view all payments" ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = course_id AND creator_id = auth.uid()
    )
  );
