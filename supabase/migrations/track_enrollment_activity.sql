-- Add updated_at to enrollments to track last activity
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create a function to update the timestamp
CREATE OR REPLACE FUNCTION public.handle_enrollment_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update updated_at automatically
DROP TRIGGER IF EXISTS on_enrollment_update ON public.enrollments;
CREATE TRIGGER on_enrollment_update
  BEFORE UPDATE ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_enrollment_update();
