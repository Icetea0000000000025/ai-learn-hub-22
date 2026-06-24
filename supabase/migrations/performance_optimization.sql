-- Performance Optimization for Scaling (200+ users)
-- This migration optimizes the courses table to reduce subqueries and improve performance.

-- 1. Create a function to refresh the student count automatically
-- This replaces the expensive client-side counting.
CREATE OR REPLACE FUNCTION public.refresh_course_student_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.courses
    SET students = students + 1
    WHERE id = NEW.course_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.courses
    SET students = students - 1
    WHERE id = OLD.course_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach trigger to enrollments table
DROP TRIGGER IF EXISTS tr_refresh_course_student_count ON public.enrollments;
CREATE TRIGGER tr_refresh_course_student_count
AFTER INSERT OR DELETE ON public.enrollments
FOR EACH ROW EXECUTE PROCEDURE public.refresh_course_student_count();

-- 3. Initial Sync: Update existing student counts in one go
UPDATE public.courses c
SET students = (
  SELECT count(*)
  FROM public.enrollments e
  WHERE e.course_id = c.id
);

-- 4. Ensure we have indexes for all common filter columns
CREATE INDEX IF NOT EXISTS idx_courses_status ON public.courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_category ON public.courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_level ON public.courses(level);
CREATE INDEX IF NOT EXISTS idx_courses_rating ON public.courses(rating DESC);
