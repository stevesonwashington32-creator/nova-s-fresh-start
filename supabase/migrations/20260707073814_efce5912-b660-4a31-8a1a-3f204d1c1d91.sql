
REVOKE EXECUTE ON FUNCTION public.auto_cancel_stale_reservations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_cancel_stale_reservations() TO service_role;
