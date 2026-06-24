-- Coupons Table
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_amount DECIMAL NOT NULL,
    usage_limit INTEGER DEFAULT 0, -- 0 for unlimited
    used_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Update Payments to track coupon usage
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL;

-- RLS for Coupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read valid coupons" ON public.coupons FOR SELECT USING (true);
-- Admin only for insert/delete (simplified)
CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
