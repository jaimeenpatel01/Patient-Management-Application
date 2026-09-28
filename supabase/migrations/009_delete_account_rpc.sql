-- Add RPC function for a user to delete their own account
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- We delete the user from auth.users.
  -- The profiles table has ON DELETE CASCADE, so it and all other related data will be deleted as well.
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
