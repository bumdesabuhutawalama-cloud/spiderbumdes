import { supabase } from "@/integrations/supabase/client";

export type ReportType = "BS" | "PL" | "CONSOLIDATED";

/**
 * Ambil hasil laporan dari report_cache. Jika tidak ada, jalankan `builder()`,
 * simpan hasilnya ke cache, lalu kembalikan. Cache otomatis di-invalidate oleh
 * trigger DB ketika ada jurnal baru pada periode terkait.
 */
export async function getOrBuildReport<T>(opts: {
  type: ReportType;
  unitId?: string | null;
  period: string; // YYYY-MM (end period / as-of)
  periodStart?: string | null; // YYYY-MM (untuk PL)
  builder: () => Promise<T>;
}): Promise<T> {
  const { type, unitId = null, period, periodStart = null, builder } = opts;

  let q = supabase
    .from("report_cache")
    .select("report_json")
    .eq("report_type", type)
    .eq("period", period)
    .limit(1);
  q = unitId ? q.eq("unit_id", unitId) : q.is("unit_id", null);
  q = periodStart ? q.eq("period_start", periodStart) : q.is("period_start", null);

  const { data } = await q;
  if (data && data.length > 0) {
    return data[0].report_json as T;
  }

  const fresh = await builder();
  await supabase.from("report_cache").insert({
    report_type: type,
    unit_id: unitId,
    period,
    period_start: periodStart,
    report_json: fresh as unknown as object,
  });
  return fresh;
}
