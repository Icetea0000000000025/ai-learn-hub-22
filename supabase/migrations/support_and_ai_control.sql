
-- Support System
CREATE TABLE IF NOT EXISTS public.support_threads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id),
  subject text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT support_threads_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES public.support_threads(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id),
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT support_messages_pkey PRIMARY KEY (id)
);

-- AI Control & Monitoring
CREATE TABLE IF NOT EXISTS public.ai_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id),
  feature text NOT NULL, -- 'course_gen', 'quiz_gen', 'image_gen', 'resource_gen'
  prompt text,
  response_status integer,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable AI by default
INSERT INTO public.system_settings (key, value) 
VALUES ('ai_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Quota settings (per day or total, we will treat as total for this simple implementation)
INSERT INTO public.system_settings (key, value) 
VALUES ('ai_quotas', '{"course_gen": 5, "quiz_gen": 20, "image_gen": 10}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- RLS Policies
ALTER TABLE public.support_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Users can see their own threads/messages
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own threads') THEN
    CREATE POLICY "Users can view their own threads" ON public.support_threads FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create their own threads') THEN
    CREATE POLICY "Users can create their own threads" ON public.support_threads FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view messages in their threads') THEN
    CREATE POLICY "Users can view messages in their threads" ON public.support_messages FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.support_threads WHERE id = thread_id AND user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can send messages in their threads') THEN
    CREATE POLICY "Users can send messages in their threads" ON public.support_messages FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.support_threads WHERE id = thread_id AND user_id = auth.uid())
    );
  END IF;
END $$;

-- Admins can do everything
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage support threads') THEN
    CREATE POLICY "Admins can manage support threads" ON public.support_threads FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage support messages') THEN
    CREATE POLICY "Admins can manage support messages" ON public.support_messages FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view AI logs') THEN
    CREATE POLICY "Admins can view AI logs" ON public.ai_logs FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage system settings') THEN
    CREATE POLICY "Admins can manage system settings" ON public.system_settings FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read some settings') THEN
    CREATE POLICY "Public can read some settings" ON public.system_settings FOR SELECT USING (true);
  END IF;
END $$;

-- Update payments status check to include 'refunded' and 'disputed'
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text, 'disputed'::text]));
