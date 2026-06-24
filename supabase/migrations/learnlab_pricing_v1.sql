-- Learnlab Pricing & Ads Migration
-- Tiers: Free, Starter, Growth, Pro
-- Ads: Featured, Keyword, Revenue-share

-- 1. Update Profiles for Subscription Tiers
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'growth', 'pro'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_expires_at timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_course_creation_count integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_ai_reset_at timestamp with time zone DEFAULT now();

-- 2. Update Courses for Ad Placements
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS ad_type text DEFAULT 'none' CHECK (ad_type IN ('none', 'featured', 'keyword', 'revenue_share'));
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS ad_expires_at timestamp with time zone;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_campaign_active boolean DEFAULT false;

-- 3. Add Ad Purchases Table to track history
CREATE TABLE IF NOT EXISTS public.ad_purchases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id),
    course_id uuid REFERENCES public.courses(id),
    ad_type text NOT NULL,
    duration_days integer NOT NULL,
    amount numeric NOT NULL,
    currency text DEFAULT 'thb',
    status text DEFAULT 'completed',
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL
);

-- RLS for Ad Purchases
ALTER TABLE public.ad_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own ad purchases" ON public.ad_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all ad purchases" ON public.ad_purchases FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Ensure platform_fee_percent is present and handled correctly (already added in record_platform_fee.sql but let's be safe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'platform_fee_percent') THEN
        ALTER TABLE public.payments ADD COLUMN platform_fee_percent numeric DEFAULT 30;
    END IF;
END $$;

-- 5. Helper function to get creator's current platform fee percentage
CREATE OR REPLACE FUNCTION get_creator_platform_fee(creator_uuid uuid)
RETURNS numeric AS $$
DECLARE
    tier text;
BEGIN
    SELECT subscription_tier INTO tier FROM public.profiles WHERE id = creator_uuid;
    
    CASE tier
        WHEN 'pro' THEN RETURN 5;
        WHEN 'growth' THEN RETURN 10;
        WHEN 'starter' THEN RETURN 12;
        ELSE RETURN 20; -- free tier
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
