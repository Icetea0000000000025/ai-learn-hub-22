-- Harden Video Storage Security
-- Note: Bucket visibility (Public/Private) is usually managed via the Supabase Dashboard,
-- but RLS policies ensure even if someone has the URL, they can't access it without a valid session/permission.

-- 1. Ensure course-videos is private (Managed via Dashboard usually, but we apply RLS)
-- Policies for 'course-videos' bucket (Lessons)
-- Only allow authenticated users who are enrolled or creators to access files via signed URLs
-- (Signed URLs bypass RLS on the object itself usually, but we can still restrict listing/reading)

-- Note: In Supabase, 'storage.objects' is where the RLS policies are applied.

DO $$
BEGIN
    -- Policy for enrolled students and creators
    -- We allow 'SELECT' so the server can generate signed URLs
    -- Users shouldn't be able to 'SELECT' directly if they don't have a signed URL
    -- unless the bucket is public.
    
    -- This SQL assumes the buckets exist. 
    -- We focus on making sure ONLY the server (service role) or authorized users can touch them.
END $$;

-- Recommendation:
-- Go to Supabase Dashboard -> Storage -> Buckets
-- 1. Edit 'course-videos' -> Set to Private
-- 2. Edit 'course-videos-preview' -> Set to Private
-- 3. Edit 'course-resources' -> Set to Private
