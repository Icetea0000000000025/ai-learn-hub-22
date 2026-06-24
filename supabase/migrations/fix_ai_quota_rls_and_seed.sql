-- 1. Ensure all AI features are in the quota settings
-- This prevents them from defaulting to 50 in the code.
UPDATE public.system_settings 
SET value = value || '{"certificate_gen": 10, "resource_gen": 10, "lesson_gen": 10, "metadata_gen": 10}'::jsonb
WHERE key = 'ai_quotas';

-- 2. Add RLS policies for ai_logs to allow users to record/view their own activity
-- This provides a fallback if the admin client has issues, though it should be bypassed by Service Role anyway.
DROP POLICY IF EXISTS "Users can insert their own AI logs" ON public.ai_logs;
CREATE POLICY "Users can insert their own AI logs" ON public.ai_logs 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own AI logs" ON public.ai_logs;
CREATE POLICY "Users can view their own AI logs" ON public.ai_logs 
  FOR SELECT USING (auth.uid() = user_id);

-- 3. Ensure admins can still do everything
DROP POLICY IF EXISTS "Admins can manage all AI logs" ON public.ai_logs;
CREATE POLICY "Admins can manage all AI logs" ON public.ai_logs 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
