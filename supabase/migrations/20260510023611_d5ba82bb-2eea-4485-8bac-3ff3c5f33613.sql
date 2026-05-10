-- New COA accounts for USP
INSERT INTO public.coa_accounts (code, name, type, normal_balance, entry_type, status) VALUES
  ('1.1.03.04', 'Piutang Pinjaman USP', 'ASET', 'DEBIT', 'Detail', 'Aktif'),
  ('6.1.10.00', 'Beban Operasional USP', 'BEBAN', 'DEBIT', 'Header', 'Aktif'),
  ('6.1.10.01', 'Beban Operasional USP', 'BEBAN', 'DEBIT', 'Detail', 'Aktif')
ON CONFLICT DO NOTHING;

-- Loans table
CREATE TABLE IF NOT EXISTS public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  borrower_name text NOT NULL,
  principal_amount numeric NOT NULL DEFAULT 0,
  interest_rate numeric NOT NULL DEFAULT 0,
  tenure_months integer NOT NULL DEFAULT 1,
  start_date date NOT NULL,
  monthly_installment numeric NOT NULL DEFAULT 0,
  outstanding_principal numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loans_public_read" ON public.loans FOR SELECT USING (true);
CREATE POLICY "loans_auth_insert" ON public.loans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "loans_anon_insert" ON public.loans FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "loans_auth_update" ON public.loans FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "loans_anon_update" ON public.loans FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "loans_auth_delete" ON public.loans FOR DELETE TO authenticated USING (true);

CREATE TRIGGER loans_set_updated_at
  BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Loan installments table
CREATE TABLE IF NOT EXISTS public.loan_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  installment_no integer NOT NULL,
  due_date date NOT NULL,
  principal_due numeric NOT NULL DEFAULT 0,
  interest_due numeric NOT NULL DEFAULT 0,
  total_due numeric NOT NULL DEFAULT 0,
  is_paid boolean NOT NULL DEFAULT false,
  paid_date date,
  paid_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loan_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "li_public_read" ON public.loan_installments FOR SELECT USING (true);
CREATE POLICY "li_auth_insert" ON public.loan_installments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "li_anon_insert" ON public.loan_installments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "li_auth_update" ON public.loan_installments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "li_anon_update" ON public.loan_installments FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "li_auth_delete" ON public.loan_installments FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_loan_installments_loan ON public.loan_installments(loan_id, installment_no);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);

-- Insert Unit Simpan Pinjam if not exists
INSERT INTO public.units (name, code, status)
SELECT 'Unit Simpan Pinjam', 'USP', 'Aktif'
WHERE NOT EXISTS (SELECT 1 FROM public.units WHERE code = 'USP');