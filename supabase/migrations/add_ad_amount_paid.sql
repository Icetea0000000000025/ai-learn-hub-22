-- Add ad_amount_paid to courses to support price-based sorting for ads
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS ad_amount_paid numeric DEFAULT 0;

-- Ensure ad_type has proper indexing for performance if not already present
CREATE INDEX IF NOT EXISTS idx_courses_ad_type_amount ON public.courses(ad_type, ad_amount_paid DESC);
