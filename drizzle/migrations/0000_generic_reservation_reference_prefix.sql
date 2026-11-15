ALTER TABLE public.reservations
  ALTER COLUMN ref SET DEFAULT ('RSV-' || lpad(nextval('public.reservation_ref_seq')::text, 4, '0'));