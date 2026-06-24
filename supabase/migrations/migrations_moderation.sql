-- Migration: Create reports table for content moderation
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  description text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'resolved'::text, 'rejected'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE,
  CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admins can see all reports
CREATE POLICY "Admins can see all reports" ON public.reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Users can see their own reports
CREATE POLICY "Users can see their own reports" ON public.reports
  FOR SELECT USING (reporter_id = auth.uid());

-- Users can insert reports
CREATE POLICY "Users can insert reports" ON public.reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

-- Admins can update reports (status)
CREATE POLICY "Admins can update reports" ON public.reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
