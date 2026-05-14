-- 1) Insert unit Perdagangan
INSERT INTO public.units (code, name, is_pusat, status, kas_account_id)
SELECT 'DAGANG', 'Unit Perdagangan', false, 'Aktif',
  (SELECT id FROM public.coa_accounts WHERE code = '1.1.01.99' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.units WHERE code = 'DAGANG');

-- 2) Map RK accounts (Pusat <-> Dagang) jika belum ada
DO $$
DECLARE v_pusat uuid; v_dagang uuid; v_rk_dagang uuid; v_rk_pusat uuid;
BEGIN
  SELECT id INTO v_pusat FROM public.units WHERE is_pusat = true LIMIT 1;
  SELECT id INTO v_dagang FROM public.units WHERE code = 'DAGANG' LIMIT 1;
  SELECT id INTO v_rk_dagang FROM public.coa_accounts WHERE code = '1.1.99.09' LIMIT 1;
  -- Pusat menyimpan RK ke Dagang -> 1.1.99.09 (RK Unit Perdagangan)
  IF v_pusat IS NOT NULL AND v_dagang IS NOT NULL AND v_rk_dagang IS NOT NULL THEN
    INSERT INTO public.entity_rk_accounts (owner_entity_id, counter_entity_id, account_id)
    VALUES (v_pusat, v_dagang, v_rk_dagang)
    ON CONFLICT DO NOTHING;
  END IF;
  -- Dagang menyimpan RK ke Pusat -> coba pakai 1.1.99.01 (RK Pusat) jika ada, kalau tidak skip
  SELECT id INTO v_rk_pusat FROM public.coa_accounts WHERE code IN ('1.1.99.01','1.1.99.00') ORDER BY code LIMIT 1;
  IF v_pusat IS NOT NULL AND v_dagang IS NOT NULL AND v_rk_pusat IS NOT NULL THEN
    INSERT INTO public.entity_rk_accounts (owner_entity_id, counter_entity_id, account_id)
    VALUES (v_dagang, v_pusat, v_rk_pusat)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 3) Tabel produk
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  uom text NOT NULL DEFAULT 'PCS',
  selling_price numeric NOT NULL DEFAULT 0,
  avg_cost numeric NOT NULL DEFAULT 0,
  stock_qty numeric NOT NULL DEFAULT 0,
  min_stock numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Aktif',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unit_id, code)
);

CREATE INDEX IF NOT EXISTS products_unit_idx ON public.products(unit_id);

-- 4) Kartu stok (movements)
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  movement_date date NOT NULL DEFAULT CURRENT_DATE,
  movement_type text NOT NULL CHECK (movement_type IN ('IN','OUT','ADJUST')),
  qty numeric NOT NULL,
  unit_cost numeric NOT NULL DEFAULT 0,
  total_value numeric NOT NULL DEFAULT 0,
  reference text,
  journal_entry_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_movements_product_idx ON public.stock_movements(product_id, movement_date);

-- 5) Trigger updated_at on products
DROP TRIGGER IF EXISTS tg_products_updated ON public.products;
CREATE TRIGGER tg_products_updated
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6) RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_auth_read ON public.products;
CREATE POLICY products_auth_read ON public.products FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS products_scoped_write ON public.products;
CREATE POLICY products_scoped_write ON public.products FOR ALL TO authenticated
USING (is_pusat(auth.uid()) OR unit_id = get_user_unit_id(auth.uid()))
WITH CHECK (is_pusat(auth.uid()) OR unit_id = get_user_unit_id(auth.uid()));

DROP POLICY IF EXISTS sm_auth_read ON public.stock_movements;
CREATE POLICY sm_auth_read ON public.stock_movements FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS sm_scoped_write ON public.stock_movements;
CREATE POLICY sm_scoped_write ON public.stock_movements FOR ALL TO authenticated
USING (is_pusat(auth.uid()) OR unit_id = get_user_unit_id(auth.uid()))
WITH CHECK (is_pusat(auth.uid()) OR unit_id = get_user_unit_id(auth.uid()));