-- 1. Ensure the update_updated_at_column function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Add missing updated_at to enrollments if it doesn't exist
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 3. Create or Update trigger for updated_at on enrollments
DROP TRIGGER IF EXISTS set_updated_at ON public.enrollments;
CREATE TRIGGER set_updated_at 
BEFORE UPDATE ON public.enrollments 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
