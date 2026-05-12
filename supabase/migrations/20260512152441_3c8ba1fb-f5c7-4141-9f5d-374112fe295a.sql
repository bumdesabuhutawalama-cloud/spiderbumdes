
-- =========================
-- 1) DROP ANON WRITE POLICIES
-- =========================
DROP POLICY IF EXISTS je_anon_insert ON public.journal_entries;
DROP POLICY IF EXISTS jel_anon_insert ON public.journal_entry_lines;
DROP POLICY IF EXISTS loans_anon_insert ON public.loans;
DROP POLICY IF EXISTS loans_anon_update ON public.loans;
DROP POLICY IF EXISTS li_anon_insert ON public.loan_installments;
DROP POLICY IF EXISTS li_anon_update ON public.loan_installments;
DROP POLICY IF EXISTS era_anon_write ON public.entity_rk_accounts;
DROP POLICY IF EXISTS et_anon_write ON public.entity_transfers;
DROP POLICY IF EXISTS pdc_anon_write ON public.profit_distribution_config;
DROP POLICY IF EXISTS pdr_anon_write ON public.profit_distribution_runs;
DROP POLICY IF EXISTS rc_anon_write ON public.report_cache;

-- =========================
-- 2) RESTRICT PUBLIC READ -> AUTHENTICATED
-- =========================

-- journal_entries
DROP POLICY IF EXISTS je_public_read ON public.journal_entries;
CREATE POLICY je_auth_read ON public.journal_entries
  FOR SELECT TO authenticated USING (true);

-- journal_entry_lines
DROP POLICY IF EXISTS jel_public_read ON public.journal_entry_lines;
CREATE POLICY jel_auth_read ON public.journal_entry_lines
  FOR SELECT TO authenticated USING (true);

-- account_balances
DROP POLICY IF EXISTS ab_public_read ON public.account_balances;
CREATE POLICY ab_auth_read ON public.account_balances
  FOR SELECT TO authenticated USING (true);

-- loans
DROP POLICY IF EXISTS loans_public_read ON public.loans;
CREATE POLICY loans_auth_read ON public.loans
  FOR SELECT TO authenticated USING (true);

-- loan_installments
DROP POLICY IF EXISTS li_public_read ON public.loan_installments;
CREATE POLICY li_auth_read ON public.loan_installments
  FOR SELECT TO authenticated USING (true);

-- entity_transfers
DROP POLICY IF EXISTS et_read ON public.entity_transfers;
CREATE POLICY et_auth_read ON public.entity_transfers
  FOR SELECT TO authenticated USING (true);

-- entity_rk_accounts
DROP POLICY IF EXISTS era_read ON public.entity_rk_accounts;
CREATE POLICY era_auth_read ON public.entity_rk_accounts
  FOR SELECT TO authenticated USING (true);

-- profit_distribution_config
DROP POLICY IF EXISTS pdc_read ON public.profit_distribution_config;
CREATE POLICY pdc_auth_read ON public.profit_distribution_config
  FOR SELECT TO authenticated USING (true);

-- profit_distribution_runs
DROP POLICY IF EXISTS pdr_read ON public.profit_distribution_runs;
CREATE POLICY pdr_auth_read ON public.profit_distribution_runs
  FOR SELECT TO authenticated USING (true);

-- report_cache
DROP POLICY IF EXISTS rc_public_read ON public.report_cache;
CREATE POLICY rc_auth_read ON public.report_cache
  FOR SELECT TO authenticated USING (true);

-- =========================
-- 3) REVOKE EXECUTE ON SECURITY DEFINER FUNCTIONS
-- =========================
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_pusat(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_unit_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.recalc_account_balance(uuid, text) FROM PUBLIC, anon, authenticated;
