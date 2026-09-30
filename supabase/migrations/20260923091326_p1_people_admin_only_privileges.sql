-- P1 PEOPLE ADMIN ONLY PRIVILEGES
revoke all on table public.families from anon;
revoke all on table public.family_members from anon;
revoke all on table public.visitors from anon;
revoke all on table public.follow_up_tasks from anon;
revoke all on table public.new_converts from anon;
