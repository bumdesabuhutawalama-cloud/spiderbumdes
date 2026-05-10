-- Journal entries header
CREATE TABLE public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_date DATE NOT NULL,
  transaction_type TEXT NOT NULL,
  description TEXT,
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Journal entry lines
CREATE TABLE public.journal_entry_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.coa_accounts(id),
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  debit NUMERIC(18,2) NOT NULL DEFAULT 0,
  credit NUMERIC(18,2) NOT NULL DEFAULT 0,
  line_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_jel_journal ON public.journal_entry_lines(journal_entry_id);
CREATE INDEX idx_jel_account ON public.journal_entry_lines(account_id);
CREATE INDEX idx_je_date ON public.journal_entries(transaction_date);
CREATE INDEX idx_je_type ON public.journal_entries(transaction_type);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;

-- Public read (consistent with coa_accounts)
CREATE POLICY "je_public_read" ON public.journal_entries FOR SELECT USING (true);
CREATE POLICY "jel_public_read" ON public.journal_entry_lines FOR SELECT USING (true);

-- Authenticated full access
CREATE POLICY "je_auth_insert" ON public.journal_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "je_auth_update" ON public.journal_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "je_auth_delete" ON public.journal_entries FOR DELETE TO authenticated USING (true);

CREATE POLICY "jel_auth_insert" ON public.journal_entry_lines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "jel_auth_update" ON public.journal_entry_lines FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "jel_auth_delete" ON public.journal_entry_lines FOR DELETE TO authenticated USING (true);

-- Anonymous insert (matches existing app pattern with no auth on writes for COA-like)
CREATE POLICY "je_anon_insert" ON public.journal_entries FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "jel_anon_insert" ON public.journal_entry_lines FOR INSERT TO anon WITH CHECK (true);

CREATE TRIGGER trg_je_updated_at
BEFORE UPDATE ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();