-- Add platform_fee_percent to payments to record the fee at the time of purchase
-- This ensures that historical data remains accurate even if the global fee changes.
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS platform_fee_percent numeric DEFAULT 30;

-- Update existing payments to use the current default (30%) if they were null
UPDATE public.payments SET platform_fee_percent = 30 WHERE platform_fee_percent IS NULL;
