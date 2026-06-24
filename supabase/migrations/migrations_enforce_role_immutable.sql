-- Apply this in a new migration file to prevent users from escalating their own privileges
CREATE OR REPLACE FUNCTION prevent_role_update() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Allow the system/service role to bypass this, but anon/authenticated users cannot.
    -- If using auth.uid() it's an API request. Service role requests typically don't have auth.uid().
    -- However, to be safe, we just check if it's the user updating their own profile via RLS.
    -- Since RLS already handles the UPDATE policy, and it's executing under the user's context,
    -- this trigger will catch the client-side attempt.
    RAISE EXCEPTION 'Role modification is not permitted directly via the client.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_role_immutable ON public.profiles;
CREATE TRIGGER enforce_role_immutable
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE prevent_role_update();
