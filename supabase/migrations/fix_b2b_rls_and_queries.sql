-- Ensure RLS for organization_member_courses
ALTER TABLE public.organization_member_courses ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organization_member_courses' AND policyname = 'Owners can manage member assignments'
    ) THEN
        CREATE POLICY "Owners can manage member assignments" ON public.organization_member_courses
        FOR ALL TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.organization_members om
                JOIN public.organizations o ON om.organization_id = o.id
                WHERE om.id = organization_member_courses.member_id
                AND o.owner_id = auth.uid()
            )
        );
    END IF;
END $$;

-- Fix the packages query to be more efficient
-- Ensure used_seats is synced (optional but good)
