-- Extend journal_entries dengan transfer_group_id (tidak ubah core)
ALTER TABLE public.journal_entries 
  ADD COLUMN IF NOT EXISTS transfer_group_id uuid;
CREATE INDEX IF NOT EXISTS idx_je_transfer_group ON public.journal_entries(transfer_group_id);

-- Extend units: tandai entitas Pusat & default kas
ALTER TABLE public.units 
  ADD COLUMN IF NOT EXISTS is_pusat boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kas_account_id uuid;

-- Buat entitas Pusat jika belum ada
INSERT INTO public.units (name, code, is_pusat, kas_account_id, status)
SELECT 'BUMDes Pusat', 'PUSAT', true,
  (SELECT id FROM public.coa_accounts WHERE code='1.1.01.01' LIMIT 1), 'Aktif'
WHERE NOT EXISTS (SELECT 1 FROM public.units WHERE is_pusat = true);

-- Default kas USP
UPDATE public.units
SET kas_account_id = (SELECT id FROM public.coa_accounts WHERE code='1.1.01.06' LIMIT 1)
WHERE code='USP' AND kas_account_id IS NULL;

-- Mapping akun RK per pasangan entitas
CREATE TABLE IF NOT EXISTS public.entity_rk_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_entity_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  counter_entity_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.coa_accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_entity_id, counter_entity_id)
);
ALTER TABLE public.entity_rk_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY era_read ON public.entity_rk_accounts FOR SELECT USING (true);
CREATE POLICY era_auth_write ON public.entity_rk_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY era_anon_write ON public.entity_rk_accounts FOR ALL TO anon USING (true) WITH CHECK (true);

-- Tabel transfer antar entitas
CREATE TABLE IF NOT EXISTS public.entity_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_date date NOT NULL,
  from_entity_id uuid NOT NULL REFERENCES public.units(id),
  to_entity_id uuid NOT NULL REFERENCES public.units(id),
  amount numeric NOT NULL,
  description text,
  transfer_group_id uuid NOT NULL DEFAULT gen_random_uuid(),
  journal_from_id uuid,
  journal_to_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT et_diff_entity CHECK (from_entity_id <> to_entity_id),
  CONSTRAINT et_amount_positive CHECK (amount > 0)
);
ALTER TABLE public.entity_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY et_read ON public.entity_transfers FOR SELECT USING (true);
CREATE POLICY et_auth_write ON public.entity_transfers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY et_anon_write ON public.entity_transfers FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_et_group ON public.entity_transfers(transfer_group_id);

-- Pra-link akun RK existing utk pasangan PUSAT-USP
DO $$
DECLARE
  v_pusat uuid; v_usp uuid; v_rk_usp uuid; v_rk_pusat uuid;
BEGIN
  SELECT id INTO v_pusat FROM public.units WHERE is_pusat = true LIMIT 1;
  SELECT id INTO v_usp FROM public.units WHERE code = 'USP' LIMIT 1;
  SELECT id INTO v_rk_usp FROM public.coa_accounts WHERE code = '1.1.99.05' LIMIT 1;
  SELECT id INTO v_rk_pusat FROM public.coa_accounts WHERE code = '3.8.01.02' LIMIT 1;
  IF v_pusat IS NOT NULL AND v_usp IS NOT NULL AND v_rk_usp IS NOT NULL THEN
    INSERT INTO public.entity_rk_accounts (owner_entity_id, counter_entity_id, account_id)
    VALUES (v_pusat, v_usp, v_rk_usp) ON CONFLICT DO NOTHING;
  END IF;
  IF v_pusat IS NOT NULL AND v_usp IS NOT NULL AND v_rk_pusat IS NOT NULL THEN
    INSERT INTO public.entity_rk_accounts (owner_entity_id, counter_entity_id, account_id)
    VALUES (v_usp, v_pusat, v_rk_pusat) ON CONFLICT DO NOTHING;
  END IF;
END $$;