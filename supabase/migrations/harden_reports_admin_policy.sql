-- Migration: Allow admins to manage all reports (Full CRUD)
DROP POLICY IF EXISTS "Admins can manage all reports" ON public.reports;
CREATE POLICY "Admins can manage all reports" ON public.reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
