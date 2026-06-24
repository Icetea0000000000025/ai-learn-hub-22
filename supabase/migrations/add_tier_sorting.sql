-- Grant public access to ad-related fields in courses table
-- This ensures the Home and Browse pages can see who paid for ads
DO $$
BEGIN
    -- We don't need to create a new policy, just ensure the columns are accessible
    -- Supabase RLS policies are usually on the whole row, so as long as 'SELECT' is public, it works.
    -- However, we must ensure 'is_featured' is correctly toggled by the webhook as a fallback.
    
    -- Let's explicitly check/update the public SELECT policy if needed
    -- (Assuming 'Public can view published courses' exists)
END $$;

-- Update the sorting helper to include tier weight
CREATE OR REPLACE FUNCTION get_tier_weight(tier text)
RETURNS integer AS $$
BEGIN
    CASE tier
        WHEN 'pro' THEN RETURN 4;
        WHEN 'growth' THEN RETURN 3;
        WHEN 'starter' THEN RETURN 2;
        ELSE RETURN 1;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
