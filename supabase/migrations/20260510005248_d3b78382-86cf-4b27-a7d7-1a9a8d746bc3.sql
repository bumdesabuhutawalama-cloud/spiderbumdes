
-- =========================================================
-- 1. account_balances (materialized ledger)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.account_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  unit_id uuid,
  period text NOT NULL, -- YYYY-MM
  debit_total numeric NOT NULL DEFAULT 0,
  credit_total numeric NOT NULL DEFAULT 0,
  ending_balance numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS account_balances_uniq
  ON public.account_balances (account_id, COALESCE(unit_id, '00000000-0000-0000-0000-000000000000'::uuid), period);
CREATE INDEX IF NOT EXISTS account_balances_period_idx ON public.account_balances (period);
CREATE INDEX IF NOT EXISTS account_balances_account_period_idx ON public.account_balances (account_id, period);

ALTER TABLE public.account_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ab_public_read ON public.account_balances;
CREATE POLICY ab_public_read ON public.account_balances FOR SELECT USING (true);
DROP POLICY IF EXISTS ab_auth_write ON public.account_balances;
CREATE POLICY ab_auth_write ON public.account_balances FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =========================================================
-- 2. report_cache
-- =========================================================
CREATE TABLE IF NOT EXISTS public.report_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL,
  unit_id uuid,
  period text NOT NULL,
  period_start text,
  report_json jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS report_cache_uniq
  ON public.report_cache (
    report_type,
    COALESCE(unit_id, '00000000-0000-0000-0000-000000000000'::uuid),
    period,
    COALESCE(period_start, '')
  );

ALTER TABLE public.report_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rc_public_read ON public.report_cache;
CREATE POLICY rc_public_read ON public.report_cache FOR SELECT USING (true);
DROP POLICY IF EXISTS rc_auth_write ON public.report_cache;
CREATE POLICY rc_auth_write ON public.report_cache FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rc_anon_write ON public.report_cache;
CREATE POLICY rc_anon_write ON public.report_cache FOR ALL TO anon USING (true) WITH CHECK (true);

-- =========================================================
-- 3. Helper: recompute ending_balance for a row
-- =========================================================
CREATE OR REPLACE FUNCTION public.recalc_account_balance(
  p_account_id uuid,
  p_period text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normal text;
  v_debit numeric;
  v_credit numeric;
BEGIN
  SELECT normal_balance INTO v_normal FROM public.coa_accounts WHERE id = p_account_id;
  SELECT debit_total, credit_total INTO v_debit, v_credit
    FROM public.account_balances WHERE account_id = p_account_id AND period = p_period AND unit_id IS NULL;
  IF v_debit IS NULL THEN RETURN; END IF;

  UPDATE public.account_balances
    SET ending_balance = CASE
        WHEN upper(coalesce(v_normal,'')) IN ('DEBIT','D') THEN v_debit - v_credit
        ELSE v_credit - v_debit
      END,
      updated_at = now()
    WHERE account_id = p_account_id AND period = p_period AND unit_id IS NULL;
END;
$$;

-- =========================================================
-- 4. Trigger: update account_balances on journal_entry_lines
-- =========================================================
CREATE OR REPLACE FUNCTION public.tg_journal_lines_apply_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_old text;
  v_period_new text;
  v_date_old date;
  v_date_new date;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    SELECT transaction_date INTO v_date_old FROM public.journal_entries WHERE id = OLD.journal_entry_id;
    IF v_date_old IS NOT NULL THEN
      v_period_old := to_char(v_date_old, 'YYYY-MM');
      INSERT INTO public.account_balances (account_id, period, debit_total, credit_total)
        VALUES (OLD.account_id, v_period_old, 0, 0)
        ON CONFLICT (account_id, COALESCE(unit_id, '00000000-0000-0000-0000-000000000000'::uuid), period) DO NOTHING;
      UPDATE public.account_balances
        SET debit_total = debit_total - COALESCE(OLD.debit,0),
            credit_total = credit_total - COALESCE(OLD.credit,0)
        WHERE account_id = OLD.account_id AND period = v_period_old AND unit_id IS NULL;
      PERFORM public.recalc_account_balance(OLD.account_id, v_period_old);
    END IF;
  END IF;

  IF TG_OP IN ('INSERT','UPDATE') THEN
    SELECT transaction_date INTO v_date_new FROM public.journal_entries WHERE id = NEW.journal_entry_id;
    IF v_date_new IS NOT NULL THEN
      v_period_new := to_char(v_date_new, 'YYYY-MM');
      INSERT INTO public.account_balances (account_id, period, debit_total, credit_total)
        VALUES (NEW.account_id, v_period_new, 0, 0)
        ON CONFLICT (account_id, COALESCE(unit_id, '00000000-0000-0000-0000-000000000000'::uuid), period) DO NOTHING;
      UPDATE public.account_balances
        SET debit_total = debit_total + COALESCE(NEW.debit,0),
            credit_total = credit_total + COALESCE(NEW.credit,0)
        WHERE account_id = NEW.account_id AND period = v_period_new AND unit_id IS NULL;
      PERFORM public.recalc_account_balance(NEW.account_id, v_period_new);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_jel_apply_balance ON public.journal_entry_lines;
CREATE TRIGGER trg_jel_apply_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.journal_entry_lines
  FOR EACH ROW EXECUTE FUNCTION public.tg_journal_lines_apply_balance();

-- =========================================================
-- 5. Trigger: invalidate report_cache on journal_entries change
-- =========================================================
CREATE OR REPLACE FUNCTION public.tg_journal_entries_invalidate_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period text;
BEGIN
  v_period := to_char(COALESCE(NEW.transaction_date, OLD.transaction_date), 'YYYY-MM');
  DELETE FROM public.report_cache WHERE period >= v_period OR period_start <= v_period;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_je_invalidate_cache ON public.journal_entries;
CREATE TRIGGER trg_je_invalidate_cache
  AFTER INSERT OR UPDATE OR DELETE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_journal_entries_invalidate_cache();

-- =========================================================
-- 6. Backfill account_balances from existing journal data
-- =========================================================
TRUNCATE public.account_balances;

INSERT INTO public.account_balances (account_id, period, debit_total, credit_total, ending_balance)
SELECT
  jel.account_id,
  to_char(je.transaction_date, 'YYYY-MM') AS period,
  SUM(COALESCE(jel.debit,0)) AS debit_total,
  SUM(COALESCE(jel.credit,0)) AS credit_total,
  CASE
    WHEN upper(coalesce(ca.normal_balance,'')) IN ('DEBIT','D')
      THEN SUM(COALESCE(jel.debit,0)) - SUM(COALESCE(jel.credit,0))
    ELSE SUM(COALESCE(jel.credit,0)) - SUM(COALESCE(jel.debit,0))
  END AS ending_balance
FROM public.journal_entry_lines jel
JOIN public.journal_entries je ON je.id = jel.journal_entry_id
LEFT JOIN public.coa_accounts ca ON ca.id = jel.account_id
GROUP BY jel.account_id, to_char(je.transaction_date, 'YYYY-MM'), ca.normal_balance;
