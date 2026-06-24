-- Add subscription tracking to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active' CHECK (subscription_status = ANY (ARRAY['active', 'expired', 'past_due', 'canceled']));
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS subscription_expires_at timestamp with time zone;

-- Update organization_packages to ensure used_seats is accurate
-- Actually, the get_org_used_seats function already exists, we might want a trigger to sync it
-- but for now we'll handle it in the application logic or via a view.

-- Ensure RLS allows admins/owners to delete assignments (for revoking)
-- The existing policy "Owners can manage member assignments" with FOR ALL already covers this.
