ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS original_journal_id uuid NULL REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS correction_type text NULL,
  ADD COLUMN IF NOT EXISTS correction_reason text NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Posted';

CREATE INDEX IF NOT EXISTS idx_journal_entries_original ON public.journal_entries(original_journal_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON public.journal_entries(status);