
-- 1. COA flags
ALTER TABLE public.coa_accounts
  ADD COLUMN IF NOT EXISTS is_fixed_asset boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_accumulated_depreciation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_depreciation_expense boolean NOT NULL DEFAULT false;

UPDATE public.coa_accounts SET is_fixed_asset = true
 WHERE code IN ('1.3.01.01','1.3.02.01','1.3.03.01','1.3.04.01','1.3.05.01','1.3.99.99');

UPDATE public.coa_accounts SET is_accumulated_depreciation = true
 WHERE code IN ('1.3.07.01','1.3.07.02','1.3.07.03','1.3.07.04','1.9.02.01');

UPDATE public.coa_accounts SET is_depreciation_expense = true
 WHERE code IN ('6.1.07.02','6.1.07.03','6.1.07.04','6.1.07.05');

-- 2. Mapping table
CREATE TABLE IF NOT EXISTS public.fixed_asset_coa_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coa_asset_id uuid NOT NULL UNIQUE,
  coa_accumulated_depr_id uuid,
  coa_depr_expense_id uuid,
  default_useful_life_years integer NOT NULL DEFAULT 4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fixed_asset_coa_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY famap_read ON public.fixed_asset_coa_mapping FOR SELECT TO authenticated USING (true);
CREATE POLICY famap_write ON public.fixed_asset_coa_mapping FOR ALL TO authenticated
  USING (public.is_pusat(auth.uid())) WITH CHECK (public.is_pusat(auth.uid()));

-- Seed mapping by code
INSERT INTO public.fixed_asset_coa_mapping (coa_asset_id, coa_accumulated_depr_id, coa_depr_expense_id, default_useful_life_years)
SELECT a.id, acc.id, exp.id, life FROM (
  VALUES
    ('1.3.01.01', NULL::text, NULL::text, 0),    -- Tanah: tidak disusutkan
    ('1.3.02.01', '1.3.07.01', '6.1.07.02', 8),  -- Kendaraan
    ('1.3.03.01', '1.3.07.02', '6.1.07.03', 4),  -- Peralatan & Mesin
    ('1.3.04.01', '1.3.07.03', '6.1.07.04', 4),  -- Meubelair
    ('1.3.05.01', '1.3.07.04', '6.1.07.05', 20), -- Gedung & Bangunan
    ('1.3.99.99', '1.9.02.01', NULL,         5)  -- Aset Lainnya
) AS m(asset_code, acc_code, exp_code, life)
JOIN public.coa_accounts a ON a.code = m.asset_code
LEFT JOIN public.coa_accounts acc ON acc.code = m.acc_code
LEFT JOIN public.coa_accounts exp ON exp.code = m.exp_code
ON CONFLICT (coa_asset_id) DO UPDATE
  SET coa_accumulated_depr_id = EXCLUDED.coa_accumulated_depr_id,
      coa_depr_expense_id = EXCLUDED.coa_depr_expense_id,
      default_useful_life_years = EXCLUDED.default_useful_life_years,
      updated_at = now();

CREATE TRIGGER famap_set_updated_at BEFORE UPDATE ON public.fixed_asset_coa_mapping
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. fixed_assets
CREATE TABLE IF NOT EXISTS public.fixed_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid,
  asset_name text NOT NULL,
  acquisition_date date NOT NULL,
  acquisition_cost numeric NOT NULL DEFAULT 0,
  useful_life_years integer NOT NULL DEFAULT 4,
  depreciation_method text NOT NULL DEFAULT 'straight_line',
  coa_asset_id uuid NOT NULL,
  coa_accumulated_depr_id uuid,
  coa_depr_expense_id uuid,
  accumulated_depreciation numeric NOT NULL DEFAULT 0,
  book_value numeric NOT NULL DEFAULT 0,
  last_depreciation_date date,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_from_journal_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fixed_assets_unit ON public.fixed_assets(unit_id);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_journal ON public.fixed_assets(created_from_journal_id);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_status ON public.fixed_assets(status);

ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY fa_read ON public.fixed_assets FOR SELECT TO authenticated
  USING (public.is_pusat(auth.uid()) OR unit_id IS NULL OR unit_id = public.get_user_unit_id(auth.uid()));
CREATE POLICY fa_insert ON public.fixed_assets FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY fa_update ON public.fixed_assets FOR UPDATE TO authenticated
  USING (public.is_pusat(auth.uid()) OR unit_id = public.get_user_unit_id(auth.uid()))
  WITH CHECK (public.is_pusat(auth.uid()) OR unit_id = public.get_user_unit_id(auth.uid()));
CREATE POLICY fa_delete ON public.fixed_assets FOR DELETE TO authenticated
  USING (public.is_pusat(auth.uid()));

CREATE TRIGGER fa_set_updated_at BEFORE UPDATE ON public.fixed_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. fixed_asset_depreciation_history
CREATE TABLE IF NOT EXISTS public.fixed_asset_depreciation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.fixed_assets(id) ON DELETE CASCADE,
  period_month integer NOT NULL,
  period_year integer NOT NULL,
  depreciation_amount numeric NOT NULL DEFAULT 0,
  journal_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_id, period_year, period_month)
);

ALTER TABLE public.fixed_asset_depreciation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY fadh_read ON public.fixed_asset_depreciation_history FOR SELECT TO authenticated
  USING (
    public.is_pusat(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.fixed_assets fa
      WHERE fa.id = fixed_asset_depreciation_history.asset_id
        AND (fa.unit_id IS NULL OR fa.unit_id = public.get_user_unit_id(auth.uid()))
    )
  );
CREATE POLICY fadh_write ON public.fixed_asset_depreciation_history FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 5. Trigger: auto create fixed_asset from journal lines
CREATE OR REPLACE FUNCTION public.tg_journal_lines_auto_create_asset()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_fa boolean;
  v_acc_name text;
  v_tx_date date;
  v_tx_desc text;
  v_unit_id uuid;
  v_map RECORD;
BEGIN
  IF COALESCE(NEW.debit,0) <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT is_fixed_asset, name INTO v_is_fa, v_acc_name
    FROM public.coa_accounts WHERE id = NEW.account_id;
  IF NOT COALESCE(v_is_fa, false) THEN
    RETURN NEW;
  END IF;

  -- Avoid duplicate (same journal, same asset account)
  IF EXISTS (
    SELECT 1 FROM public.fixed_assets
    WHERE created_from_journal_id = NEW.journal_entry_id
      AND coa_asset_id = NEW.account_id
  ) THEN
    RETURN NEW;
  END IF;

  SELECT transaction_date, description INTO v_tx_date, v_tx_desc
    FROM public.journal_entries WHERE id = NEW.journal_entry_id;

  -- Detect owning unit via kas account on credit lines of same journal
  SELECT u.id INTO v_unit_id
    FROM public.journal_entry_lines l
    JOIN public.units u ON u.kas_account_id = l.account_id
   WHERE l.journal_entry_id = NEW.journal_entry_id
     AND COALESCE(l.credit,0) > 0
     AND u.is_pusat = false
   LIMIT 1;

  SELECT * INTO v_map FROM public.fixed_asset_coa_mapping WHERE coa_asset_id = NEW.account_id;

  INSERT INTO public.fixed_assets (
    unit_id, asset_name, acquisition_date, acquisition_cost,
    useful_life_years, depreciation_method,
    coa_asset_id, coa_accumulated_depr_id, coa_depr_expense_id,
    accumulated_depreciation, book_value, status, created_from_journal_id, notes
  ) VALUES (
    v_unit_id,
    COALESCE(NULLIF(v_tx_desc, ''), v_acc_name),
    v_tx_date,
    NEW.debit,
    COALESCE(v_map.default_useful_life_years, 4),
    'straight_line',
    NEW.account_id,
    v_map.coa_accumulated_depr_id,
    v_map.coa_depr_expense_id,
    0,
    NEW.debit,
    'ACTIVE',
    NEW.journal_entry_id,
    v_tx_desc
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_jel_auto_create_asset ON public.journal_entry_lines;
CREATE TRIGGER tg_jel_auto_create_asset
AFTER INSERT ON public.journal_entry_lines
FOR EACH ROW EXECUTE FUNCTION public.tg_journal_lines_auto_create_asset();
