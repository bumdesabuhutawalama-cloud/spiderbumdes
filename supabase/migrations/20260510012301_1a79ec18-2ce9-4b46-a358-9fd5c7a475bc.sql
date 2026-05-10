CREATE TABLE IF NOT EXISTS public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  status text NOT NULL DEFAULT 'Aktif',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

CREATE POLICY units_public_read ON public.units FOR SELECT USING (true);
CREATE POLICY units_auth_insert ON public.units FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY units_auth_update ON public.units FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY units_auth_delete ON public.units FOR DELETE TO authenticated USING (true);

CREATE TRIGGER units_set_updated_at BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_account_balances_unit ON public.account_balances(unit_id);