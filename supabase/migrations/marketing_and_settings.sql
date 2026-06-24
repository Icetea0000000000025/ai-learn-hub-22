-- Add marketing fields to courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_on_sale BOOLEAN DEFAULT false;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS sale_price NUMERIC DEFAULT 0;

-- Create system_notifications table
CREATE TABLE IF NOT EXISTS public.system_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' CHECK (type = ANY (ARRAY['info', 'warning', 'success', 'promotion'])),
  target_role text DEFAULT 'all' CHECK (target_role = ANY (ARRAY['all', 'student', 'creator', 'admin'])),
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  link_url text,
  CONSTRAINT system_notifications_pkey PRIMARY KEY (id)
);

-- Enable RLS for system_notifications
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read active notifications
CREATE POLICY "Anyone can read active notifications" ON public.system_notifications
  FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Allow admins full control
CREATE POLICY "Admins have full control over notifications" ON public.system_notifications
  FOR ALL TO public USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Seed initial system settings if not exists
INSERT INTO public.system_settings (key, value)
VALUES 
  ('platform_revenue_share', '30'),
  ('site_branding', '{"name": "AI Spark Learn", "logo_url": "", "primary_color": "#6366f1"}'),
  ('policies', '{"terms": "Default Terms of Service", "privacy": "Default Privacy Policy"}')
ON CONFLICT (key) DO NOTHING;
