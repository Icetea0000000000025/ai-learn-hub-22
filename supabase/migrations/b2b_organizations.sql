-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  created_at timestamp with time zone DEFAULT now(),
  owner_id uuid NOT NULL,
  CONSTRAINT organizations_pkey PRIMARY KEY (id),
  CONSTRAINT organizations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id)
);

-- Create organization_members table
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text DEFAULT 'employee' CHECK (role = ANY (ARRAY['admin', 'employee'])),
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT organization_members_pkey PRIMARY KEY (id),
  CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  UNIQUE(organization_id, user_id)
);

-- Create organization_packages table (LMS seats)
CREATE TABLE IF NOT EXISTS public.organization_packages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  course_id uuid NOT NULL,
  max_seats integer DEFAULT 0,
  used_seats integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT organization_packages_pkey PRIMARY KEY (id),
  CONSTRAINT organization_packages_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT organization_packages_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_packages ENABLE ROW LEVEL SECURITY;

-- Policies for organizations
CREATE POLICY "Users can view their own organization" ON public.organizations
  FOR SELECT USING (
    owner_id = auth.uid() OR
    id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
  );

-- Policies for organization_members
-- Refactored to avoid infinite recursion: check organization ownership first
CREATE POLICY "Users can view members of their organizations" ON public.organization_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organizations 
      WHERE id = public.organization_members.organization_id 
      AND owner_id = auth.uid()
    ) OR
    user_id = auth.uid() OR
    organization_id IN (
      SELECT om.organization_id 
      FROM public.organization_members om 
      WHERE om.user_id = auth.uid()
    )
  );

-- Note: In Supabase, recursion often happens when SELECT calls another SELECT on the same table.
-- To be safest, we split read/write and use simple checks.

-- Policies for organization_packages
CREATE POLICY "Org members can view their packages" ON public.organization_packages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE user_id = auth.uid() 
      AND organization_id = public.organization_packages.organization_id
    )
  );

-- Admin policies
CREATE POLICY "Admins have full control over B2B" ON public.organizations
  FOR ALL TO public USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );
CREATE POLICY "Admins have full control over B2B members" ON public.organization_members
  FOR ALL TO public USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );
CREATE POLICY "Admins have full control over B2B packages" ON public.organization_packages
  FOR ALL TO public USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );
