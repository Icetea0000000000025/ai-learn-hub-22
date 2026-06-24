-- Add bundle_id and organization_id to payments for better fulfillment tracking and recovery
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS bundle_id uuid REFERENCES public.bundles(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS seat_count integer DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_intent_id text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS is_fulfilled boolean DEFAULT false;

-- Update RLS to allow users to see their own payments with these new columns
-- Existing policies should already cover this if they use SELECT *
