
-- ============ Restrict COA writes to admin_pusat ============
DROP POLICY IF EXISTS coa_accounts_auth_insert ON public.coa_accounts;
DROP POLICY IF EXISTS coa_accounts_auth_update ON public.coa_accounts;
DROP POLICY IF EXISTS coa_accounts_auth_delete ON public.coa_accounts;

CREATE POLICY coa_accounts_pusat_insert ON public.coa_accounts
  FOR INSERT TO authenticated WITH CHECK (public.is_pusat(auth.uid()));
CREATE POLICY coa_accounts_pusat_update ON public.coa_accounts
  FOR UPDATE TO authenticated USING (public.is_pusat(auth.uid())) WITH CHECK (public.is_pusat(auth.uid()));
CREATE POLICY coa_accounts_pusat_delete ON public.coa_accounts
  FOR DELETE TO authenticated USING (public.is_pusat(auth.uid()));

-- ============ Restrict units writes to admin_pusat ============
DROP POLICY IF EXISTS units_auth_insert ON public.units;
DROP POLICY IF EXISTS units_auth_update ON public.units;
DROP POLICY IF EXISTS units_auth_delete ON public.units;

CREATE POLICY units_pusat_insert ON public.units
  FOR INSERT TO authenticated WITH CHECK (public.is_pusat(auth.uid()));
CREATE POLICY units_pusat_update ON public.units
  FOR UPDATE TO authenticated USING (public.is_pusat(auth.uid())) WITH CHECK (public.is_pusat(auth.uid()));
CREATE POLICY units_pusat_delete ON public.units
  FOR DELETE TO authenticated USING (public.is_pusat(auth.uid()));

-- ============ Restrict profit_distribution writes to admin_pusat ============
DROP POLICY IF EXISTS pdc_auth_write ON public.profit_distribution_config;
CREATE POLICY pdc_pusat_write ON public.profit_distribution_config
  FOR ALL TO authenticated
  USING (public.is_pusat(auth.uid()))
  WITH CHECK (public.is_pusat(auth.uid()));

DROP POLICY IF EXISTS pdr_auth_write ON public.profit_distribution_runs;
CREATE POLICY pdr_pusat_write ON public.profit_distribution_runs
  FOR ALL TO authenticated
  USING (public.is_pusat(auth.uid()))
  WITH CHECK (public.is_pusat(auth.uid()));

-- ============ Harden SECURITY DEFINER functions: remove EXECUTE from public/anon/authenticated ============
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_pusat(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_unit_id(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_account_balance(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_journal_lines_apply_balance() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_journal_entries_invalidate_cache() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
