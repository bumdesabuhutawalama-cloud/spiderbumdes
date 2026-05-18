import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  PlayCircle,
  Pencil,
  Sparkles,
  History,
  AlertTriangle,
  CalendarRange,
} from "lucide-react";
import { PageHeader } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { invalidateFinancials } from "@/lib/query-invalidate";
import { toast } from "sonner";

type AssetRow = {
  id: string;
  unit_id: string | null;
  asset_name: string;
  acquisition_date: string;
  acquisition_cost: number;
  useful_life_years: number;
  depreciation_method: string;
  coa_asset_id: string;
  coa_accumulated_depr_id: string | null;
  coa_depr_expense_id: string | null;
  accumulated_depreciation: number;
  book_value: number;
  last_depreciation_date: string | null;
  status: string;
  created_from_journal_id: string | null;
  notes: string | null;
};

type CoaLite = { id: string; code: string; name: string };

type HistoryRow = {
  id: string;
  asset_id: string;
  period_month: number;
  period_year: number;
  depreciation_amount: number;
  created_at: string;
};

const formatRp = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0,
  );

const monthsBetween = (fromISO: string, toISO: string): number => {
  const f = new Date(fromISO);
  const t = new Date(toISO);
  if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) return 0;
  let m = (t.getFullYear() - f.getFullYear()) * 12 + (t.getMonth() - f.getMonth());
  if (t.getDate() < f.getDate()) m -= 1;
  return Math.max(0, m);
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const currentPeriod = () => todayISO().slice(0, 7);

export function FixedAssetsPage({
  title,
  subtitle,
  fixedUnitCode,
}: {
  title: string;
  subtitle: string;
  fixedUnitCode?: string;
}) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"monthly" | "backfill">("monthly");
  const [period, setPeriod] = useState<string>(currentPeriod());
  const [backfillEnd, setBackfillEnd] = useState<string>(`${new Date().getFullYear()}-12-31`);
  const [editing, setEditing] = useState<AssetRow | null>(null);
  const [historyFor, setHistoryFor] = useState<AssetRow | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const unit = useQuery({
    queryKey: ["unit-by-code-aset", fixedUnitCode ?? ""],
    enabled: !!fixedUnitCode,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id,code,name")
        .eq("code", fixedUnitCode!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const unitId = fixedUnitCode ? unit.data?.id ?? null : null;
  const unitReady = !fixedUnitCode || !!unit.data;

  const assets = useQuery({
    queryKey: ["fixed_assets", fixedUnitCode ?? "all", unitId ?? ""],
    enabled: unitReady,
    queryFn: async () => {
      let q = supabase
        .from("fixed_assets" as never)
        .select("*")
        .order("acquisition_date", { ascending: false });
      if (fixedUnitCode && unitId) q = q.eq("unit_id", unitId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as AssetRow[];
    },
  });

  const coa = useQuery({
    queryKey: ["coa-lite-aset"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coa_accounts")
        .select("id,code,name")
        .order("code");
      if (error) throw error;
      return (data ?? []) as CoaLite[];
    },
  });

  const coaById = useMemo(() => {
    const m = new Map<string, CoaLite>();
    (coa.data ?? []).forEach((a) => m.set(a.id, a));
    return m;
  }, [coa.data]);

  const today = todayISO();
  const computed = useMemo(() => {
    return (assets.data ?? []).map((a) => {
      const monthlyDepr =
        a.useful_life_years > 0 ? a.acquisition_cost / (a.useful_life_years * 12) : 0;
      const yearly = monthlyDepr * 12;
      const elapsed = monthsBetween(a.acquisition_date, today);
      const maxAcc = a.acquisition_cost;
      const accSim = Math.min(maxAcc, monthlyDepr * elapsed);
      const accReal = Number(a.accumulated_depreciation) || 0;
      const bookReal = a.acquisition_cost - accReal;
      return { row: a, monthlyDepr, yearly, accSim, accReal, bookReal };
    });
  }, [assets.data, today]);

  const runDepr = useMutation({
    mutationFn: async (p: string) => {
      const [yStr, mStr] = p.split("-");
      const year = Number(yStr);
      const month = Number(mStr);
      if (!year || !month) throw new Error("Periode tidak valid");
      const periodEnd = new Date(year, month, 0).toISOString().slice(0, 10);

      const list = (assets.data ?? []).filter(
        (a) =>
          a.status === "ACTIVE" &&
          a.useful_life_years > 0 &&
          a.coa_accumulated_depr_id &&
          a.coa_depr_expense_id,
      );
      if (list.length === 0) throw new Error("Tidak ada aset yang dapat disusutkan periode ini.");

      let processed = 0;
      let skipped = 0;
      for (const a of list) {
        // Skip if already depreciated this period
        const { data: exists } = await supabase
          .from("fixed_asset_depreciation_history" as never)
          .select("id")
          .eq("asset_id", a.id)
          .eq("period_year", year)
          .eq("period_month", month)
          .maybeSingle();
        if (exists) {
          skipped += 1;
          continue;
        }

        const monthly = a.acquisition_cost / (a.useful_life_years * 12);
        const remaining = Math.max(0, a.acquisition_cost - Number(a.accumulated_depreciation || 0));
        const amount = Math.min(monthly, remaining);
        if (amount <= 0.5) {
          skipped += 1;
          continue;
        }

        const expAcc = coaById.get(a.coa_depr_expense_id!);
        const accAcc = coaById.get(a.coa_accumulated_depr_id!);
        if (!expAcc || !accAcc) {
          skipped += 1;
          continue;
        }

        const { data: je, error: jeErr } = await supabase
          .from("journal_entries")
          .insert({
            transaction_date: periodEnd,
            transaction_type: "PENYUSUTAN",
            description: `Penyusutan ${a.asset_name} periode ${p}`,
            total_amount: amount,
          })
          .select("id")
          .single();
        if (jeErr || !je) throw jeErr ?? new Error("Gagal membuat jurnal");

        const { error: lErr } = await supabase.from("journal_entry_lines").insert([
          {
            journal_entry_id: je.id,
            account_id: expAcc.id,
            account_code: expAcc.code,
            account_name: expAcc.name,
            debit: amount,
            credit: 0,
            line_order: 1,
          },
          {
            journal_entry_id: je.id,
            account_id: accAcc.id,
            account_code: accAcc.code,
            account_name: accAcc.name,
            debit: 0,
            credit: amount,
            line_order: 2,
          },
        ]);
        if (lErr) throw lErr;

        await supabase.from("fixed_asset_depreciation_history" as never).insert({
          asset_id: a.id,
          period_year: year,
          period_month: month,
          depreciation_amount: amount,
          journal_id: je.id,
        } as never);

        const newAcc = Number(a.accumulated_depreciation || 0) + amount;
        const newBook = a.acquisition_cost - newAcc;
        await supabase
          .from("fixed_assets" as never)
          .update({
            accumulated_depreciation: newAcc,
            book_value: newBook,
            last_depreciation_date: periodEnd,
            status: newBook <= 0.5 ? "FULLY_DEPRECIATED" : "ACTIVE",
          } as never)
          .eq("id", a.id);
        processed += 1;
      }

      return { processed, skipped };
    },
    onSuccess: ({ processed, skipped }) => {
      toast.success(`Penyusutan selesai: ${processed} aset diproses, ${skipped} dilewati.`);
      void invalidateFinancials(qc);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Gagal menjalankan penyusutan."),
  });

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-lg border border-border/60 bg-secondary/60 px-3 py-2 text-sm outline-none [color-scheme:dark]"
            />
            <button
              onClick={() => runDepr.mutate(period)}
              disabled={runDepr.isPending || !computed.length}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] px-4 py-2 text-sm font-semibold text-[oklch(0.15_0.03_250)] glow-cyan hover:opacity-90 transition disabled:opacity-50"
            >
              {runDepr.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              Jalankan Penyusutan
            </button>
          </div>
        }
      />

      <div className="glass-card mb-4 flex items-start gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
        <div className="text-muted-foreground">
          Aset tetap dibuat <strong>otomatis</strong> dari jurnal pembelian aset (menu{" "}
          <em>Catat Kegiatan → Belanja Aset</em>). Tidak ada input manual di halaman ini —
          jurnal adalah sumber data tunggal.
        </div>
      </div>

      <div className="glass-card rounded-2xl p-3 sm:p-5">
        {(!unitReady || assets.isLoading) && (
          <div className="py-12 text-center text-muted-foreground">
            <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
            Memuat aset...
          </div>
        )}
        {assets.error && (
          <div className="py-8 text-center text-rose-400">
            Gagal memuat: {(assets.error as Error).message}
          </div>
        )}
        {assets.data && assets.data.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            Belum ada aset tetap. Buat lewat <em>Catat Kegiatan → Belanja Aset</em>.
          </div>
        )}

        {computed.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-border/40">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="bg-secondary/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Nama Aset</th>
                  <th className="px-3 py-2 text-left">Akun Aset</th>
                  <th className="px-3 py-2 text-left">Tgl Perolehan</th>
                  <th className="px-3 py-2 text-right">Harga Perolehan</th>
                  <th className="px-3 py-2 text-right">Umur (thn)</th>
                  <th className="px-3 py-2 text-right">Penyusutan / bln</th>
                  <th className="px-3 py-2 text-right">Akumulasi</th>
                  <th className="px-3 py-2 text-right">Nilai Buku</th>
                  <th className="px-3 py-2 text-center">Status</th>
                  <th className="px-3 py-2 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {computed.map(({ row, monthlyDepr, accReal, bookReal }) => {
                  const asset = coaById.get(row.coa_asset_id);
                  const needsMapping =
                    row.useful_life_years > 0 &&
                    (!row.coa_accumulated_depr_id || !row.coa_depr_expense_id);
                  return (
                    <tr key={row.id} className="border-t border-border/40 hover:bg-secondary/30">
                      <td className="px-3 py-2">
                        <div className="font-medium">{row.asset_name}</div>
                        {needsMapping && (
                          <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-amber-400">
                            <AlertTriangle className="h-3 w-3" /> Mapping akumulasi/beban belum lengkap
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {asset ? `${asset.code} — ${asset.name}` : "—"}
                      </td>
                      <td className="px-3 py-2">{row.acquisition_date}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        {formatRp(row.acquisition_cost)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {row.useful_life_years === 0 ? "—" : row.useful_life_years}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        {monthlyDepr > 0 ? formatRp(monthlyDepr) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-amber-300">
                        {formatRp(accReal)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold text-[var(--neon-green)]">
                        {formatRp(bookReal)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            row.status === "ACTIVE"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-slate-500/15 text-slate-300"
                          }`}
                        >
                          {row.status === "ACTIVE" ? "Aktif" : "Habis"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => setEditing(row)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            title="Edit nama/umur"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setHistoryFor(row)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            title="Riwayat penyusutan"
                          >
                            <History className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && <EditAssetDialog asset={editing} onClose={() => setEditing(null)} />}
      {historyFor && <HistoryDialog asset={historyFor} onClose={() => setHistoryFor(null)} />}
    </>
  );
}

function EditAssetDialog({ asset, onClose }: { asset: AssetRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(asset.asset_name);
  const [life, setLife] = useState(String(asset.useful_life_years));

  const save = useMutation({
    mutationFn: async () => {
      const lifeN = Number(life);
      if (!name.trim()) throw new Error("Nama wajib diisi.");
      if (!Number.isInteger(lifeN) || lifeN < 0) throw new Error("Umur harus bilangan bulat ≥ 0.");
      const { error } = await supabase
        .from("fixed_assets" as never)
        .update({ asset_name: name.trim(), useful_life_years: lifeN } as never)
        .eq("id", asset.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aset diperbarui.");
      void invalidateFinancials(qc);
      onClose();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Gagal memperbarui aset."),
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="glass-card w-full max-w-md rounded-2xl border border-border/60 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold">Edit Aset</h3>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs uppercase text-muted-foreground">Nama Aset</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border/60 bg-secondary/60 px-3 py-2 text-sm outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase text-muted-foreground">
              Umur Ekonomis (tahun)
            </span>
            <input
              type="number"
              min={0}
              value={life}
              onChange={(e) => setLife(e.target.value)}
              className="w-full rounded-lg border border-border/60 bg-secondary/60 px-3 py-2 text-sm outline-none"
            />
            <span className="mt-1 block text-[11px] text-muted-foreground">
              Isi 0 untuk aset yang tidak disusutkan (mis. tanah).
            </span>
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-border/60 bg-secondary px-4 py-2 text-sm"
          >
            Batal
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] px-4 py-2 text-sm font-semibold text-[oklch(0.15_0.03_250)]"
          >
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryDialog({ asset, onClose }: { asset: AssetRow; onClose: () => void }) {
  const hist = useQuery({
    queryKey: ["fa-history", asset.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixed_asset_depreciation_history" as never)
        .select("*")
        .eq("asset_id", asset.id)
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as HistoryRow[];
    },
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="glass-card w-full max-w-lg rounded-2xl border border-border/60 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-lg font-semibold">Riwayat Penyusutan</h3>
        <p className="mb-4 text-xs text-muted-foreground">{asset.asset_name}</p>
        {hist.isLoading && (
          <div className="py-6 text-center text-muted-foreground">
            <Loader2 className="inline h-4 w-4 animate-spin" />
          </div>
        )}
        {hist.data && hist.data.length === 0 && (
          <div className="py-6 text-center text-muted-foreground">Belum ada penyusutan.</div>
        )}
        {hist.data && hist.data.length > 0 && (
          <div className="max-h-80 overflow-y-auto rounded-lg border border-border/40">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Periode</th>
                  <th className="px-3 py-2 text-right">Nilai Penyusutan</th>
                </tr>
              </thead>
              <tbody>
                {hist.data.map((h) => (
                  <tr key={h.id} className="border-t border-border/40">
                    <td className="px-3 py-2">
                      {String(h.period_month).padStart(2, "0")}/{h.period_year}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {formatRp(h.depreciation_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-border/60 bg-secondary px-4 py-2 text-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
