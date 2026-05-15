-- Drop the incorrectly placed trigger on public.users
DROP TRIGGER IF EXISTS on_auth_user_created ON public.users;
-- Drop the old trigger on auth.users if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- Re-create the trigger on auth.users so it fires for ALL signup methods (email, Google, etc.)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
