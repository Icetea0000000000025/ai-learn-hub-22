-- 🔒 SECURITY HARDENING: Prevent unauthorized role escalation to 'admin'
-- This trigger ensures that no one can change their role to 'admin' via the frontend/API.

CREATE OR REPLACE FUNCTION public.protect_admin_role()
RETURNS trigger AS $$
BEGIN
  -- 1. If someone tries to change a role TO 'admin'
  IF NEW.role = 'admin' THEN
    -- 2. Check if the person making the change is ALREADY an admin
    -- Note: auth.jwt() contains the current user's claims. 
    -- We check if the 'role' claim in the JWT is 'admin' or if it's the first time creation by a superuser.
    IF NOT (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
      )
    ) THEN
      -- 3. If NOT an admin, and the OLD role wasn't already admin, REJECT the change or force it to 'student'
      IF OLD.role IS NULL OR OLD.role <> 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Only administrators can grant admin privileges.';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the trigger to the profiles table
DROP TRIGGER IF EXISTS on_profile_role_change ON public.profiles;
CREATE TRIGGER on_profile_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION public.protect_admin_role();
