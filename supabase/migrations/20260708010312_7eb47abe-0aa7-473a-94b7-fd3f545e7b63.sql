
-- Sequential reservation refs (NOV-0001, NOV-0002, ...)
CREATE SEQUENCE IF NOT EXISTS public.reservation_ref_seq START WITH 1 INCREMENT BY 1;

-- Advance the sequence past any existing numeric refs so we don't collide
SELECT setval(
  'public.reservation_ref_seq',
  GREATEST(
    (SELECT COALESCE(MAX(NULLIF(regexp_replace(ref, '\D', '', 'g'), '')::bigint), 0)
     FROM public.reservations),
    0
  ) + 1,
  false
);

ALTER TABLE public.reservations
  ALTER COLUMN ref SET DEFAULT ('NOV-' || lpad(nextval('public.reservation_ref_seq')::text, 4, '0'));

GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.reservation_ref_seq TO anon, authenticated, service_role;
