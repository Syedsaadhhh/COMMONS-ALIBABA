-- COMMONS Function Execution Guard
-- Trigger functions are invoked by PostgreSQL and must not be exposed as RPCs.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
