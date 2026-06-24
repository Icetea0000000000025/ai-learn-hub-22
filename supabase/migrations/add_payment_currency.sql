-- Add currency column to payments table
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS currency text DEFAULT 'usd';

-- Update existing payments to USD as a safe default (most legacy were USD)
-- However, we can try to guess based on amount. If amount > 100, it's likely THB.
-- But that's risky. Let's just set usd for now.
UPDATE public.payments SET currency = 'usd' WHERE currency IS NULL;
