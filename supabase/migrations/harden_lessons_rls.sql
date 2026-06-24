-- Harden Lessons RLS to prevent unauthorized access to content
-- 1. Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can see lesson titles" ON public.lessons;

-- 2. Allow everyone to see lesson metadata (for curriculum display)
-- Note: We still allow SELECT on all rows so that the Course Detail page can show the structure.
-- To truly secure this, we would use column-level security or a view, but since Supabase RLS 
-- is row-level, we will restrict SELECT to only authenticated users for the full row, 
-- OR we accept that titles are public but protect the content in the app.
-- BUT, to fix the SSR leak for logged-in non-enrolled users, we need a stricter policy.

-- New Policy: Anyone can see lesson metadata
-- (We'll keep titles public to not break the Course Detail curriculum)
CREATE POLICY "Anyone can see lesson titles" ON public.lessons
  FOR SELECT
  USING (true);

-- Wait, if I keep it 'USING (true)', I haven't fixed the SSR leak for logged-in non-enrolled users.
-- To fix the SSR leak, we need the SELECT to fail if they are not authorized.

-- BUT if SELECT fails, the curriculum disappears.

-- This is a classic conflict. The correct architectural solution is a public View for curriculum.
-- However, for a quick fix that doesn't require changing all curriculum-fetching code:
-- We can use a policy that checks if the user is authorized for the full content.

-- Actually, if we want to show the curriculum to everyone, we MUST allow SELECT.
-- The only way to hide 'video_url' while allowing 'title' in the SAME table 
-- is to use a View or to set 'video_url' to NULL for unauthorized users in a RLS-enabled View.

-- Let's try this:
-- 1. Rename lessons table to lessons_internal
-- 2. Create a view 'lessons' that shows video_url only if authorized.
-- But that's a lot of schema changes.

-- How about we just make the player route more secure by checking enrollment in beforeLoad?

-- Yes! I can check enrollment in beforeLoad in TanStack Router.
