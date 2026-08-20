-- Migration: Update handle_new_user trigger to support Google OAuth avatar
-- Google OAuth stores the profile photo URL under 'picture' in raw_user_meta_data,
-- while the existing trigger only looks at 'avatar_url'. This update checks both.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'doctor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger itself (on_auth_user_created) doesn't need to be recreated
-- since CREATE OR REPLACE FUNCTION updates the function body in-place.
