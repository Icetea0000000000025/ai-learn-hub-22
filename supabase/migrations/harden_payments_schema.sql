-- Consolidated Payment Table Hardening
-- This migration ensures the payments table has all columns required for Stripe fulfillment and financial reporting.

-- 1. Ensure core columns exist
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS transaction_id TEXT UNIQUE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'usd';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS platform_fee_percent NUMERIC DEFAULT 30;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS bundle_id UUID REFERENCES public.bundles(id) ON DELETE SET NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS seat_count INTEGER DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS is_fulfilled BOOLEAN DEFAULT false;

-- 2. Migrate data from 'provider' to 'payment_method' if provider exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'provider') THEN
        UPDATE public.payments SET payment_method = provider WHERE payment_method IS NULL;
    END IF;
END $$;

-- 3. Make course_id nullable (for bundles/org purchases)
ALTER TABLE public.payments ALTER COLUMN course_id DROP NOT NULL;

-- 4. RLS Update: Ensure the service role can always bypass RLS
-- (Service role bypass is automatic, but we ensure policies don't block inserts)
DROP POLICY IF EXISTS "Service role can do everything" ON public.payments;
-- No need for a policy for service role, but we can add one for admins to view everything if not already present.

-- 5. Indexing for performance
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON public.payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
