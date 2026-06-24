-- Track specific course assignments for organization members
CREATE TABLE IF NOT EXISTS public.organization_member_courses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.organization_members(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  assigned_at timestamp with time zone DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  CONSTRAINT organization_member_courses_pkey PRIMARY KEY (id),
  UNIQUE(member_id, course_id)
);

-- Enable RLS
ALTER TABLE public.organization_member_courses ENABLE ROW LEVEL SECURITY;

-- Policies for member assignments
CREATE POLICY "Members can view their assigned courses" ON public.organization_member_courses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE id = member_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage member assignments" ON public.organization_member_courses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      JOIN public.organizations o ON om.organization_id = o.id
      WHERE om.id = organization_member_courses.member_id 
      AND (o.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
    )
  );

-- Function to handle organization requests/status
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS org_request_status text DEFAULT 'none' CHECK (org_request_status = ANY (ARRAY['none', 'pending', 'approved', 'rejected']));

-- Security Definer to count used seats correctly based on member assignments
CREATE OR REPLACE FUNCTION public.get_org_used_seats(p_org_id uuid, p_course_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT count(*)::integer FROM public.organization_member_courses omc
    JOIN public.organization_members om ON omc.member_id = om.id
    WHERE om.organization_id = p_org_id AND omc.course_id = p_course_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
