
-- COA: Kewajiban Bagi Hasil
INSERT INTO public.coa_accounts (code, name, type, normal_balance, entry_type, status) VALUES
  ('2.4.00.00','KEWAJIBAN BAGI HASIL','KEWAJIBAN','KREDIT','HEADER','Aktif'),
  ('2.4.01.00','Hutang PADes','KEWAJIBAN','KREDIT','DETAIL','Aktif'),
  ('2.4.02.00','Hutang Cadangan Modal','KEWAJIBAN','KREDIT','DETAIL','Aktif'),
  ('2.4.03.00','Hutang Pengembangan Unit','KEWAJIBAN','KREDIT','DETAIL','Aktif'),
  ('2.4.04.00','Hutang Insentif Pengurus','KEWAJIBAN','KREDIT','DETAIL','Aktif'),
  ('2.4.05.00','Hutang Dana Sosial','KEWAJIBAN','KREDIT','DETAIL','Aktif')
ON CONFLICT DO NOTHING;

-- Konfigurasi persentase bagi hasil
CREATE TABLE IF NOT EXISTS public.profit_distribution_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  percentage numeric NOT NULL,
  coa_account_code text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profit_distribution_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY pdc_read ON public.profit_distribution_config FOR SELECT USING (true);
CREATE POLICY pdc_auth_write ON public.profit_distribution_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY pdc_anon_write ON public.profit_distribution_config FOR ALL TO anon USING (true) WITH CHECK (true);

INSERT INTO public.profit_distribution_config (code, name, percentage, coa_account_code) VALUES
  ('BH-01','PADes',40,'2.4.01.00'),
  ('BH-02','Cadangan Modal',25,'2.4.02.00'),
  ('BH-03','Pengembangan Unit',20,'2.4.03.00'),
  ('BH-04','Insentif Pengurus',10,'2.4.04.00'),
  ('BH-05','Dana Sosial',5,'2.4.05.00')
ON CONFLICT (code) DO NOTHING;

-- Jejak periode yang sudah ditetapkan
CREATE TABLE IF NOT EXISTS public.profit_distribution_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  net_profit numeric NOT NULL,
  journal_entry_id uuid,
  executed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_start, period_end)
);
ALTER TABLE public.profit_distribution_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY pdr_read ON public.profit_distribution_runs FOR SELECT USING (true);
CREATE POLICY pdr_auth_write ON public.profit_distribution_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY pdr_anon_write ON public.profit_distribution_runs FOR ALL TO anon USING (true) WITH CHECK (true);
