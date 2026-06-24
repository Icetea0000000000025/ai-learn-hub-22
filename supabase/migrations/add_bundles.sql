-- Create bundles table
CREATE TABLE IF NOT EXISTS public.bundles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  price numeric DEFAULT 0,
  image_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bundles_pkey PRIMARY KEY (id)
);

-- Create bundle_courses linking table
CREATE TABLE IF NOT EXISTS public.bundle_courses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  CONSTRAINT bundle_courses_pkey PRIMARY KEY (id),
  UNIQUE(bundle_id, course_id)
);

-- Enable RLS
ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_courses ENABLE ROW LEVEL SECURITY;

-- Read policies
CREATE POLICY "Anyone can view bundles" ON public.bundles FOR SELECT USING (true);
CREATE POLICY "Anyone can view bundle courses" ON public.bundle_courses FOR SELECT USING (true);

-- Admin policies
CREATE POLICY "Admins have full control over bundles" ON public.bundles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Admins have full control over bundle courses" ON public.bundle_courses FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
