-- 🔄 UPDATE TRIGGER: Automatically set has_selected_role = true if a role is provided during registration
-- This prevents users who register via the form (and choose a role there) from seeing the modal again.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, status, has_selected_role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'role', 'student'),
    'active',
    (new.raw_user_meta_data->>'role' IS NOT NULL) -- If role is provided, mark as selected
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ✅ FIX LEGACY USERS: Mark all existing users as having selected their role
-- This will stop the modal from appearing for anyone who already has an account.
UPDATE public.profiles SET has_selected_role = true WHERE role IS NOT NULL;
