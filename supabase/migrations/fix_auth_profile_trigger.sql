-- Fix for Registration Role Bug (B-001)
-- This ensures a profile is always created with the correct role upon registration.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, status)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'role', 'student'),
    'active'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
