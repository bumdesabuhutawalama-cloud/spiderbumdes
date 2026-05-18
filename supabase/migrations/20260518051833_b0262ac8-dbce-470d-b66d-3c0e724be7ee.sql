
-- =========================================================
-- Fixed Asset Depreciation: transactional RPC + unit scoping
-- =========================================================

-- 1) RPC: run depreciation for a range of months (1 bulan untuk mode bulanan,
--    banyak bulan untuk mode backfill). Semua tulis (jurnal, history, update
--    asset) berada dalam satu transaksi function = rollback otomatis bila gagal.
CREATE OR REPLACE FUNCTION public.run_fixed_asset_depreciation(
  p_start_period text,        -- 'YYYY-MM'
  p_end_period text,          -- 'YYYY-MM'
  p_unit_id uuid DEFAULT NULL -- NULL = semua unit (pusat/konsolidasi)
)
RETURNS TABLE(processed integer, skipped integer, total_amount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_year int := split_part(p_start_period,'-',1)::int;
  v_start_month int := split_part(p_start_period,'-',2)::int;
  v_end_year int := split_part(p_end_period,'-',1)::int;
  v_end_month int := split_part(p_end_period,'-',2)::int;
  v_cur date := make_date(v_start_year, v_start_month, 1);
  v_end date := make_date(v_end_year, v_end_month, 1);
  v_period_end date;
  v_year int; v_month int;
  v_asset RECORD;
  v_monthly numeric; v_remaining numeric; v_amount numeric;
  v_exp RECORD; v_acc RECORD;
  v_je_id uuid;
  v_processed int := 0; v_skipped int := 0; v_total numeric := 0;
BEGIN
  IF v_cur > v_end THEN
    RAISE EXCEPTION 'Periode awal harus <= periode akhir';
  END IF;

  WHILE v_cur <= v_end LOOP
    v_year := EXTRACT(YEAR FROM v_cur)::int;
    v_month := EXTRACT(MONTH FROM v_cur)::int;
    v_period_end := (v_cur + INTERVAL '1 month - 1 day')::date;

    FOR v_asset IN
      SELECT * FROM public.fixed_assets
      WHERE status = 'ACTIVE'
        AND useful_life_years > 0
        AND coa_accumulated_depr_id IS NOT NULL
        AND coa_depr_expense_id IS NOT NULL
        AND acquisition_date <= v_period_end
        AND (p_unit_id IS NULL OR unit_id = p_unit_id)
    LOOP
      -- skip jika periode sudah pernah diproses
      IF EXISTS (
        SELECT 1 FROM public.fixed_asset_depreciation_history
        WHERE asset_id = v_asset.id
          AND period_year = v_year
          AND period_month = v_month
      ) THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      v_monthly := v_asset.acquisition_cost / (v_asset.useful_life_years * 12);
      v_remaining := GREATEST(0, v_asset.acquisition_cost - COALESCE(v_asset.accumulated_depreciation,0));
      v_amount := LEAST(v_monthly, v_remaining);
      IF v_amount <= 0.5 THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      SELECT id, code, name INTO v_exp FROM public.coa_accounts WHERE id = v_asset.coa_depr_expense_id;
      SELECT id, code, name INTO v_acc FROM public.coa_accounts WHERE id = v_asset.coa_accumulated_depr_id;
      IF v_exp.id IS NULL OR v_acc.id IS NULL THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      INSERT INTO public.journal_entries(transaction_date, transaction_type, description, total_amount)
      VALUES (v_period_end, 'PENYUSUTAN',
              'Penyusutan ' || v_asset.asset_name || ' periode '
                 || lpad(v_month::text,2,'0') || '/' || v_year::text,
              v_amount)
      RETURNING id INTO v_je_id;

      INSERT INTO public.journal_entry_lines(journal_entry_id, account_id, account_code, account_name, debit, credit, line_order)
      VALUES
        (v_je_id, v_exp.id, v_exp.code, v_exp.name, v_amount, 0, 1),
        (v_je_id, v_acc.id, v_acc.code, v_acc.name, 0, v_amount, 2);

      INSERT INTO public.fixed_asset_depreciation_history(asset_id, period_year, period_month, depreciation_amount, journal_id)
      VALUES (v_asset.id, v_year, v_month, v_amount, v_je_id);

      UPDATE public.fixed_assets
      SET accumulated_depreciation = COALESCE(accumulated_depreciation,0) + v_amount,
          book_value = acquisition_cost - (COALESCE(accumulated_depreciation,0) + v_amount),
          last_depreciation_date = v_period_end,
          status = CASE WHEN (acquisition_cost - (COALESCE(accumulated_depreciation,0) + v_amount)) <= 0.5
                        THEN 'FULLY_DEPRECIATED' ELSE 'ACTIVE' END,
          updated_at = now()
      WHERE id = v_asset.id;

      v_processed := v_processed + 1;
      v_total := v_total + v_amount;
    END LOOP;

    v_cur := (v_cur + INTERVAL '1 month')::date;
  END LOOP;

  RETURN QUERY SELECT v_processed, v_skipped, v_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_fixed_asset_depreciation(text, text, uuid) TO authenticated;

-- 2) RPC: preview (tanpa menulis apa-apa) — hitung jumlah aset, total nominal,
--    dan daftar periode yang akan dibuat.
CREATE OR REPLACE FUNCTION public.preview_fixed_asset_depreciation(
  p_start_period text,
  p_end_period text,
  p_unit_id uuid DEFAULT NULL
)
RETURNS TABLE(period text, asset_count integer, total_amount numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_year int := split_part(p_start_period,'-',1)::int;
  v_start_month int := split_part(p_start_period,'-',2)::int;
  v_end_year int := split_part(p_end_period,'-',1)::int;
  v_end_month int := split_part(p_end_period,'-',2)::int;
  v_cur date := make_date(v_start_year, v_start_month, 1);
  v_end date := make_date(v_end_year, v_end_month, 1);
  v_period_end date;
  v_year int; v_month int;
  v_count int; v_amount numeric;
BEGIN
  WHILE v_cur <= v_end LOOP
    v_year := EXTRACT(YEAR FROM v_cur)::int;
    v_month := EXTRACT(MONTH FROM v_cur)::int;
    v_period_end := (v_cur + INTERVAL '1 month - 1 day')::date;

    SELECT COUNT(*)::int,
           COALESCE(SUM(LEAST(
             fa.acquisition_cost / (fa.useful_life_years * 12),
             GREATEST(0, fa.acquisition_cost - COALESCE(fa.accumulated_depreciation,0))
           )),0)
      INTO v_count, v_amount
      FROM public.fixed_assets fa
     WHERE fa.status = 'ACTIVE'
       AND fa.useful_life_years > 0
       AND fa.coa_accumulated_depr_id IS NOT NULL
       AND fa.coa_depr_expense_id IS NOT NULL
       AND fa.acquisition_date <= v_period_end
       AND (p_unit_id IS NULL OR fa.unit_id = p_unit_id)
       AND NOT EXISTS (
         SELECT 1 FROM public.fixed_asset_depreciation_history h
          WHERE h.asset_id = fa.id AND h.period_year = v_year AND h.period_month = v_month
       );

    IF v_count > 0 THEN
      period := lpad(v_month::text,2,'0') || '/' || v_year::text;
      asset_count := v_count;
      total_amount := v_amount;
      RETURN NEXT;
    END IF;

    v_cur := (v_cur + INTERVAL '1 month')::date;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.preview_fixed_asset_depreciation(text, text, uuid) TO authenticated;
