
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY "Anyone can create reservations" ON public.reservations;
CREATE POLICY "Anyone can create reservations"
ON public.reservations FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(guest_name) BETWEEN 1 AND 120
  AND length(phone) BETWEEN 5 AND 40
  AND length(coalesce(special_requests,'')) <= 1000
);
