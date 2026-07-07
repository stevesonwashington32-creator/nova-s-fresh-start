
CREATE TABLE public.app_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  reservation_grace_minutes integer NOT NULL DEFAULT 45 CHECK (reservation_grace_minutes >= 0 AND reservation_grace_minutes <= 720),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view settings" ON public.app_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can update settings" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER app_settings_set_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.app_settings (id, reservation_grace_minutes) VALUES (true, 45)
  ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.auto_cancel_stale_reservations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  grace int;
BEGIN
  SELECT reservation_grace_minutes INTO grace FROM public.app_settings WHERE id = true;
  IF grace IS NULL THEN grace := 45; END IF;

  UPDATE public.reservations
  SET status = 'cancelled', updated_at = now()
  WHERE status IN ('pending', 'confirmed', 'late')
    AND ((reservation_date::timestamp + reservation_time::time) + (grace || ' minutes')::interval) <= now();
END;
$$;
