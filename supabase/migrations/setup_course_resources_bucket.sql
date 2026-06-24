-- 1. Create Course Resources Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('course-resources', 'course-resources', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS: Allow authenticated users (creators) to upload resources
-- Note: This is a simple policy. In production, you might want to restrict 
-- uploads to only the creator of the associated course.
DROP POLICY IF EXISTS "Allow Creators to Upload Resources" ON storage.objects;
CREATE POLICY "Allow Creators to Upload Resources" ON storage.objects 
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'course-resources' AND 
    auth.role() = 'authenticated'
  );

-- 3. Storage RLS: Allow public access to read resources
DROP POLICY IF EXISTS "Public Access to Resources" ON storage.objects;
CREATE POLICY "Public Access to Resources" ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'course-resources');

-- 4. Storage RLS: Allow owners to delete their own resources
DROP POLICY IF EXISTS "Allow Owners to Delete Resources" ON storage.objects;
CREATE POLICY "Allow Owners to Delete Resources" ON storage.objects 
  FOR DELETE 
  USING (
    bucket_id = 'course-resources' AND 
    auth.uid() = owner
  );
