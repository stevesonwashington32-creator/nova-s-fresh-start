
CREATE TABLE public.restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number int NOT NULL UNIQUE,
  capacity int NOT NULL CHECK (capacity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.restaurant_tables TO authenticated;
GRANT ALL ON public.restaurant_tables TO service_role;

ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view tables" ON public.restaurant_tables
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.reservations
  ADD COLUMN table_id uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.auto_cancel_stale_reservations()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.reservations
  SET status = 'cancelled', updated_at = now()
  WHERE status IN ('pending', 'confirmed')
    AND ((reservation_date::timestamp + reservation_time::time) + interval '45 minutes') <= now();
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'auto-cancel-stale-reservations',
  '* * * * *',
  $$SELECT public.auto_cancel_stale_reservations();$$
);
