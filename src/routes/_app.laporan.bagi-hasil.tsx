import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, FileCheck2, Wallet, Loader2, PieChart } from "lucide-react";
import { PageHeader } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { invalidateFinancials } from "@/lib/query-invalidate";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/laporan/bagi-hasil")({
  head: () => ({ meta: [{ title: "Bagi Hasil · BUMDes" }] }),
  component: BagiHasilPage,
});

const fmtRp = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);

type CfgRow = {
  id: string;
  code: string;
  name: string;
  percentage: number;
  coa_account_code: string;
  is_active: boolean;
};

function useConfig() {
  return useQuery({
    queryKey: ["pdc"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profit_distribution_config" as never)
        .select("*")
        .eq("is_active", true)
        .order("code");
      if (error) throw error;
      return (data ?? []) as unknown as CfgRow[];
    },
  });
}

function useRuns() {
  return useQuery({
    queryKey: ["pdr"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profit_distribution_runs" as never)
        .select("*")
        .order("period_end", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        period_start: string;
        period_end: string;
        net_profit: number;
        journal_entry_id: string | null;
        executed: boolean;
      }>;
    },
  });
}

function useNetProfit(start: string, end: string) {
  return useQuery({
    queryKey: ["net-profit", start, end],
    queryFn: async () => {
      // Ambil semua jurnal pada periode
      const { data: entries, error: e1 } = await supabase
        .from("journal_entries")
        .select("id, transaction_date")
        .gte("transaction_date", start)
        .lte("transaction_date", end);
      if (e1) throw e1;
      const ids = (entries ?? []).map((e) => e.id);
      if (ids.length === 0) return 0;
      const { data: lines, error: e2 } = await supabase
        .from("journal_entry_lines")
        .select("debit, credit, account_id, coa_accounts(type)")
        .in("journal_entry_id", ids);
      if (e2) throw e2;
      let revenue = 0;
      let expense = 0;
      for (const l of (lines ?? []) as Array<{
        debit: number;
        credit: number;
        coa_accounts: { type: string } | null;
      }>) {
        const t = l.coa_accounts?.type ?? "";
        if (t === "PENDAPATAN") revenue += Number(l.credit || 0) - Number(l.debit || 0);
        else if (t === "BEBAN" || t === "HPP") expense += Number(l.debit || 0) - Number(l.credit || 0);
      }
      return revenue - expense;
    },
  });
}

function useLiabilityBalances(codes: string[]) {
  return useQuery({
    queryKey: ["bh-liab-balance", codes.join(",")],
    enabled: codes.length > 0,
    queryFn: async () => {
      const { data: accs } = await supabase
        .from("coa_accounts")
        .select("id, code")
        .in("code", codes);
      const map = new Map((accs ?? []).map((a) => [a.id, a.code]));
      const ids = (accs ?? []).map((a) => a.id);
      if (ids.length === 0) return {} as Record<string, number>;
      const { data: lines } = await supabase
        .from("journal_entry_lines")
        .select("debit, credit, account_id")
        .in("account_id", ids);
      const out: Record<string, number> = {};
      for (const code of codes) out[code] = 0;
      for (const l of lines ?? []) {
        const code = map.get(l.account_id);
        if (!code) continue;
        out[code] = (out[code] ?? 0) + Number(l.credit || 0) - Number(l.debit || 0);
      }
      return out;
    },
  });
}

function useCashAccounts() {
  return useQuery({
    queryKey: ["cash_accounts_bh"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coa_accounts")
        .select("id, code, name, entry_type, status, type")
        .eq("type", "ASET")
        .eq("status", "Aktif")
        .or("code.like.1.1.01%,code.like.1.1.02%")
        .order("code");
      if (error) throw error;
      return (data ?? []).filter((a) => a.entry_type !== "HEADER") as Array<{ id: string; code: string; name: string }>;
    },
  });
}

function BagiHasilPage() {
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  const cfg = useConfig();
  const runs = useRuns();
  const np = useNetProfit(start, end);
  const codes = useMemo(() => (cfg.data ?? []).map((c) => c.coa_account_code), [cfg.data]);
  const liabBal = useLiabilityBalances(codes);
  const cashAccs = useCashAccounts();

  const totalPct = (cfg.data ?? []).reduce((s, c) => s + Number(c.percentage), 0);
  const netProfit = np.data ?? 0;
  const preview = (cfg.data ?? []).map((c) => ({
    ...c,
    nominal: Math.round((netProfit * Number(c.percentage)) / 100),
  }));
  const totalNominal = preview.reduce((s, r) => s + r.nominal, 0);

  const existingRun = (runs.data ?? []).find((r) => r.period_start === start && r.period_end === end);

  // === Mutations ===
  const tetapkan = useMutation({
    mutationFn: async () => {
      if (existingRun) throw new Error(`Periode ${year} sudah pernah ditetapkan.`);
      if (totalPct !== 100) throw new Error(`Total persentase ${totalPct}% (harus 100%).`);
      if (netProfit <= 0) throw new Error("Laba bersih nol/negatif, tidak ada yang dibagikan.");

      // Resolve account ids
      const allCodes = ["3.3.01.01", ...codes];
      const { data: accs, error: ae } = await supabase
        .from("coa_accounts")
        .select("id, code, name")
        .in("code", allCodes);
      if (ae) throw ae;
      const byCode = new Map((accs ?? []).map((a) => [a.code, a]));
      const sumber = byCode.get("3.3.01.01");
      if (!sumber) throw new Error("Akun 3.3.01.01 (Saldo Laba Tidak Dicadangkan) tidak ditemukan.");

      // Insert journal entry
      const desc = `Penetapan Bagi Hasil Tahun ${year}`;
      const { data: je, error: jee } = await supabase
        .from("journal_entries")
        .insert({
          transaction_date: end,
          transaction_type: "PROFIT_DISTRIBUTION",
          description: desc,
          total_amount: netProfit,
        })
        .select("id")
        .single();
      if (jee) throw jee;

      const lines: Array<{
        journal_entry_id: string;
        account_id: string;
        account_code: string;
        account_name: string;
        debit: number;
        credit: number;
        line_order: number;
      }> = [
        {
          journal_entry_id: je.id,
          account_id: sumber.id,
          account_code: sumber.code,
          account_name: sumber.name,
          debit: netProfit,
          credit: 0,
          line_order: 0,
        },
      ];
      preview.forEach((p, i) => {
        const a = byCode.get(p.coa_account_code);
        if (!a) throw new Error(`Akun ${p.coa_account_code} tidak ditemukan.`);
        lines.push({
          journal_entry_id: je.id,
          account_id: a.id,
          account_code: a.code,
          account_name: a.name,
          debit: 0,
          credit: p.nominal,
          line_order: i + 1,
        });
      });
      // Pastikan balance — sisa pembulatan masuk ke baris terakhir
      const totalCredit = lines.slice(1).reduce((s, l) => s + l.credit, 0);
      const diff = netProfit - totalCredit;
      if (diff !== 0) lines[lines.length - 1].credit += diff;

      const { error: le } = await supabase.from("journal_entry_lines").insert(lines);
      if (le) throw le;

      const { error: re } = await supabase.from("profit_distribution_runs" as never).insert({
        period_start: start,
        period_end: end,
        net_profit: netProfit,
        journal_entry_id: je.id,
        executed: true,
      } as never);
      if (re) throw re;
    },
    onSuccess: () => {
      toast.success("Bagi hasil berhasil ditetapkan.");
      void invalidateFinancials(qc);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // === Bayar ===
  const [payCode, setPayCode] = useState<string>("");
  const [payCash, setPayCash] = useState<string>("");
  const [payAmt, setPayAmt] = useState<string>("");
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [payDesc, setPayDesc] = useState<string>("");

  const bayar = useMutation({
    mutationFn: async () => {
      const amt = Number(payAmt);
      if (!payCode) throw new Error("Pilih penerima.");
      if (!payCash) throw new Error("Pilih akun kas/bank.");
      if (!amt || amt <= 0) throw new Error("Nominal harus > 0.");

      const { data: hut, error: he } = await supabase
        .from("coa_accounts")
        .select("id, code, name")
        .eq("code", payCode)
        .single();
      if (he) throw he;
      const { data: kas, error: ke } = await supabase
        .from("coa_accounts")
        .select("id, code, name")
        .eq("id", payCash)
        .single();
      if (ke) throw ke;

      // Untuk Cadangan Modal (2.4.02.00) — alokasi kembali ke Kas Alokasi Bagi Hasil
      // dan reklasifikasi Saldo Laba menjadi Saldo Laba Dicadangkan untuk Penambahan Modal.
      const isCadanganModal = payCode === "2.4.02.00";
      let kasAlokasi: { id: string; code: string; name: string } | null = null;
      let saldoLabaCad: { id: string; code: string; name: string } | null = null;
      if (isCadanganModal) {
        const { data: extras, error: ee } = await supabase
          .from("coa_accounts")
          .select("id, code, name")
          .in("code", ["1.1.01.10", "3.3.01.06"]);
        if (ee) throw ee;
        kasAlokasi = (extras ?? []).find((a) => a.code === "1.1.01.10") ?? null;
        saldoLabaCad = (extras ?? []).find((a) => a.code === "3.3.01.06") ?? null;
        if (!kasAlokasi || !saldoLabaCad)
          throw new Error("Akun 1.1.01.10 / 3.3.01.06 belum tersedia di COA.");
      }

      const { data: je, error: jee } = await supabase
        .from("journal_entries")
        .insert({
          transaction_date: payDate,
          transaction_type: "PROFIT_DISTRIBUTION_PAYMENT",
          description:
            payDesc ||
            (isCadanganModal
              ? `Pembayaran ${hut.name} — alokasi ke Kas Alokasi Bagi Hasil`
              : `Pembayaran ${hut.name}`),
          total_amount: amt,
        })
        .select("id")
        .single();
      if (jee) throw jee;

      const lines = [
        {
          journal_entry_id: je.id,
          account_id: hut.id,
          account_code: hut.code,
          account_name: hut.name,
          debit: amt,
          credit: 0,
          line_order: 0,
        },
        {
          journal_entry_id: je.id,
          account_id: kas.id,
          account_code: kas.code,
          account_name: kas.name,
          debit: 0,
          credit: amt,
          line_order: 1,
        },
      ];
      if (isCadanganModal && kasAlokasi && saldoLabaCad) {
        lines.push(
          {
            journal_entry_id: je.id,
            account_id: kasAlokasi.id,
            account_code: kasAlokasi.code,
            account_name: kasAlokasi.name,
            debit: amt,
            credit: 0,
            line_order: 2,
          },
          {
            journal_entry_id: je.id,
            account_id: saldoLabaCad.id,
            account_code: saldoLabaCad.code,
            account_name: saldoLabaCad.name,
            debit: 0,
            credit: amt,
            line_order: 3,
          },
        );
      }
      const { error: le } = await supabase.from("journal_entry_lines").insert(lines);
      if (le) throw le;
    },
    onSuccess: () => {
      toast.success("Pembayaran bagi hasil dicatat.");
      setPayAmt("");
      setPayDesc("");
      void invalidateFinancials(qc);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bagi Hasil"
        subtitle="Hitung, tetapkan, dan bayar distribusi laba berbasis jurnal."
      />

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Periode</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  Tahun {y}
                </option>
              ))}
            </select>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs text-muted-foreground">Laba Bersih Periode</div>
            <div className="text-2xl font-semibold">{np.isLoading ? "…" : fmtRp(netProfit)}</div>
          </div>
        </div>

        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left p-2">Kode</th>
                <th className="text-left p-2">Penerima</th>
                <th className="text-left p-2">Akun COA</th>
                <th className="text-right p-2">Persentase</th>
                <th className="text-right p-2">Nominal</th>
                <th className="text-right p-2">Saldo Hutang</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r) => (
                <tr key={r.code} className="border-t border-border">
                  <td className="p-2 font-mono">{r.code}</td>
                  <td className="p-2">{r.name}</td>
                  <td className="p-2 font-mono text-xs">{r.coa_account_code}</td>
                  <td className="p-2 text-right">{r.percentage}%</td>
                  <td className="p-2 text-right">{fmtRp(r.nominal)}</td>
                  <td className="p-2 text-right">{fmtRp(liabBal.data?.[r.coa_account_code] ?? 0)}</td>
                </tr>
              ))}
              <tr className="border-t border-border bg-muted/30 font-semibold">
                <td className="p-2" colSpan={3}>
                  Total
                </td>
                <td className="p-2 text-right">{totalPct}%</td>
                <td className="p-2 text-right">{fmtRp(totalNominal)}</td>
                <td className="p-2"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => np.refetch()}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-accent"
          >
            <Calculator className="h-4 w-4" /> Hitung Bagi Hasil
          </button>
          <button
            disabled={tetapkan.isPending || !!existingRun || netProfit <= 0}
            onClick={() => tetapkan.mutate()}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {tetapkan.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
            {existingRun ? `Sudah Ditetapkan (${year})` : "Tetapkan Bagi Hasil"}
          </button>
        </div>
        {existingRun && (
          <p className="text-xs text-muted-foreground">
            Periode {year} sudah ditetapkan dengan laba {fmtRp(existingRun.net_profit)}.
          </p>
        )}
      </div>

      {/* Bayar Bagi Hasil */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Bayar Bagi Hasil</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Penerima (Hutang)</label>
            <select
              value={payCode}
              onChange={(e) => setPayCode(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— pilih —</option>
              {(cfg.data ?? []).map((c) => (
                <option key={c.code} value={c.coa_account_code}>
                  {c.name} · saldo {fmtRp(liabBal.data?.[c.coa_account_code] ?? 0)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Akun Kas / Bank</label>
            <select
              value={payCash}
              onChange={(e) => setPayCash(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— pilih —</option>
              {(cashAccs.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Tanggal</label>
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Nominal</label>
            <input
              type="number"
              value={payAmt}
              onChange={(e) => setPayAmt(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              placeholder="0"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-muted-foreground mb-1">Keterangan</label>
            <input
              value={payDesc}
              onChange={(e) => setPayDesc(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              placeholder="Opsional"
            />
          </div>
        </div>
        {payCode === "2.4.02.00" && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-foreground/80">
            <strong>Penambahan Modal:</strong> dana akan dipindahkan dari kas operasional
            ke <em>Kas Alokasi Bagi Hasil (1.1.01.10)</em> dan dicatat ke
            <em> Saldo Laba Dicadangkan untuk Penambahan Modal (3.3.01.06)</em> secara otomatis.
          </div>
        )}
        <button
          disabled={bayar.isPending}
          onClick={() => bayar.mutate()}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
        >
          {bayar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
          Bayar Sekarang
        </button>
      </div>

      {/* Riwayat */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-lg font-semibold mb-3">Riwayat Penetapan</h3>
        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left p-2">Periode</th>
                <th className="text-right p-2">Laba Bersih</th>
                <th className="text-left p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(runs.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-muted-foreground">
                    Belum ada penetapan.
                  </td>
                </tr>
              )}
              {(runs.data ?? []).map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-2">
                    {r.period_start} s/d {r.period_end}
                  </td>
                  <td className="p-2 text-right">{fmtRp(Number(r.net_profit))}</td>
                  <td className="p-2">{r.executed ? "Ditetapkan" : "Draft"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
