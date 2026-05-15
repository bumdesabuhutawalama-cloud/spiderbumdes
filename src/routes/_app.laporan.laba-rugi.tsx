import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { buildReportFilename, exportElementToPdf } from "@/lib/pdf-export";
import {
  type AccountLite,
  type BalanceMap,
  type UnitMode,
  formatRpOrDash,
  useAccountBalancesPeriod,
} from "@/lib/account-balances";

export const Route = createFileRoute("/_app/laporan/laba-rugi")({
  head: () => ({ meta: [{ title: "Laba Rugi · BUMDes" }] }),
  component: () => <LabaRugiPage />,
});

type Section = { title: string; types: string[]; total: string; isExpense: boolean };

const SECTIONS: Section[] = [
  { title: "PENDAPATAN USAHA", types: ["PENDAPATAN"], total: "TOTAL PENDAPATAN USAHA", isExpense: false },
  { title: "HARGA POKOK PENJUALAN (HPP)", types: ["HPP"], total: "TOTAL HPP", isExpense: true },
  { title: "BEBAN OPERASIONAL", types: ["BEBAN"], total: "TOTAL BEBAN OPERASIONAL", isExpense: true },
  { title: "PENDAPATAN LAIN-LAIN", types: ["PENDAPATAN_LAIN"], total: "TOTAL PENDAPATAN LAIN-LAIN", isExpense: false },
  { title: "BEBAN LAIN-LAIN", types: ["BEBAN_LAIN"], total: "TOTAL BEBAN LAIN-LAIN", isExpense: true },
];

const ALL_TYPES = ["PENDAPATAN", "PENDAPATAN_LAIN", "BEBAN", "BEBAN_LAIN", "HPP"];

export function LabaRugiPage({
  title = "Laporan Laba Rugi",
  subtitle = "Pendapatan, beban, dan laba bersih · dihitung otomatis dari jurnal.",
  fixedUnitCode,
  heading,
}: {
  title?: string;
  subtitle?: string;
  fixedUnitCode?: string;
  heading?: { line1: string; line2?: string; line3: string };
} = {}) {
  const year = new Date().getFullYear();
  const [start, setStart] = useState(`${year}-01-01`);
  const [end, setEnd] = useState(`${year}-12-31`);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (!reportRef.current) return;
    try {
      setExporting(true);
      await exportElementToPdf(reportRef.current, buildReportFilename(title, `${start}_${end}`));
      toast.success("PDF berhasil diunduh");
    } catch (e) {
      toast.error("Gagal export PDF: " + (e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const prevStart = `${Number(start.slice(0, 4)) - 1}${start.slice(4)}`;
  const prevEnd = `${Number(end.slice(0, 4)) - 1}${end.slice(4)}`;

  // Resolusi unit (jika fixedUnitCode disediakan)
  const { data: fixedUnit } = useQuery({
    queryKey: ["unit-by-code", fixedUnitCode ?? ""],
    enabled: !!fixedUnitCode,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id,name,code")
        .eq("code", fixedUnitCode!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const mode: UnitMode = fixedUnitCode ? "unit" : "pusat";
  const unitId = fixedUnitCode ? fixedUnit?.id ?? null : null;
  const unitReady = !fixedUnitCode || !!fixedUnit;

  const { data: accounts, isLoading: loadingAcc, error: errAcc } = useQuery({
    queryKey: ["coa_accounts", "laba-rugi-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coa_accounts")
        .select("id,code,name,type,entry_type,normal_balance,status")
        .eq("status", "Aktif")
        .in("type", ALL_TYPES)
        .order("code", { ascending: true })
        .limit(2000);
      if (error) throw error;
      return data as AccountLite[];
    },
  });

  const { data: balCur, isLoading: lc } = useAccountBalancesPeriod(start, end, mode, unitId);
  const { data: balPrev, isLoading: lp } = useAccountBalancesPeriod(prevStart, prevEnd, mode, unitId);

  const isLoading = loadingAcc || lc || lp || !unitReady;

  // Hitung saldo per akun langsung dari raw balance (tahan terhadap header
  // tanpa anak). Pendapatan = credit - debit; Beban/HPP = debit - credit.
  const computed = useMemo(() => {
    if (!accounts || !balCur || !balPrev) return null;
    const isExpense = (t: string) => t === "BEBAN" || t === "BEBAN_LAIN" || t === "HPP";
    const signed = (raw: BalanceMap, a: AccountLite): number => {
      const r = raw.get(a.id);
      if (!r) return 0;
      return isExpense(a.type) ? r.debit - r.credit : r.credit - r.debit;
    };
    const curMap = new Map<string, number>();
    const prevMap = new Map<string, number>();
    for (const a of accounts) {
      curMap.set(a.id, signed(balCur, a));
      prevMap.set(a.id, signed(balPrev, a));
    }
    const activeIds = new Set<string>();
    for (const a of accounts) {
      const r1 = balCur.get(a.id);
      const r2 = balPrev.get(a.id);
      if (
        (r1 && (r1.debit > 0.5 || r1.credit > 0.5)) ||
        (r2 && (r2.debit > 0.5 || r2.credit > 0.5))
      ) {
        activeIds.add(a.id);
      }
    }
    return { cur: curMap, prev: prevMap, activeIds };
  }, [accounts, balCur, balPrev]);

  const titleHead = heading?.line1 ?? "Laporan Laba Rugi BUM Desa";
  const titleSub = heading?.line2 ?? "Nama BUM Desa";
  const titleDoc = heading?.line3 ?? "LAPORAN LABA RUGI";

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <>
            <div className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/60 px-3 py-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="bg-transparent text-sm outline-none [color-scheme:dark]"
              />
              <span className="text-muted-foreground">—</span>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="bg-transparent text-sm outline-none [color-scheme:dark]"
              />
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] px-4 py-2 text-sm font-medium text-[oklch(0.15_0.03_250)] glow-cyan hover:opacity-90 transition disabled:opacity-50"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exporting ? "Mengekspor..." : "Export PDF"}
            </button>
          </>
        }
      />

      <div className="glass-card rounded-2xl p-3 sm:p-5">
        <div ref={reportRef} className="overflow-x-auto rounded-xl border border-slate-200 bg-white text-slate-900 shadow-md ring-1 ring-slate-100">
          <div className="min-w-[640px] p-4 sm:p-6 font-sans text-[13px]">
            <div className="text-center mb-4 leading-tight">
              <p className="text-[12px] uppercase tracking-wider text-slate-500">{titleHead}</p>
              <p className="text-[14px] font-bold text-slate-900">{titleSub}</p>
              <p className="text-[13px] font-bold text-slate-900">{titleDoc}</p>
              <p className="text-[11px] text-slate-500">
                Periode {start} s/d {end}
              </p>
              <p className="text-[11px] italic text-slate-500">dalam Rupiah</p>
            </div>

            {isLoading && (
              <div className="py-12 text-center text-slate-500">
                <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                Memuat data laporan...
              </div>
            )}
            {errAcc && (
              <div className="py-8 text-center text-rose-600">
                Gagal memuat: {(errAcc as Error).message}
              </div>
            )}

            {!isLoading && !errAcc && computed && accounts && (
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="border-y-2 border-slate-900 text-slate-900 font-semibold">
                    <th className="w-12 py-1.5 text-center">No.</th>
                    <th className="text-left py-1.5 px-2">Uraian</th>
                    <th className="w-28 py-1.5 text-right px-2">Periode Ini</th>
                    <th className="w-28 py-1.5 text-right px-2">Periode Lalu</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let no = 0;
                    let totalIncomeCur = 0;
                    let totalIncomePrev = 0;
                    let totalExpenseCur = 0;
                    let totalExpensePrev = 0;

                    const rendered: React.ReactNode[] = [];

                    for (let si = 0; si < SECTIONS.length; si++) {
                      const section = SECTIONS[si];
                      const sectionAccounts = accounts.filter(
                        (a) => section.types.includes(a.type) && computed.activeIds.has(a.id),
                      );
                      // Skip seksi tanpa data agar laporan ringkas
                      if (sectionAccounts.length === 0) continue;

                      no += 1;
                      rendered.push(
                        <tr key={`s-${si}`} className="bg-slate-100">
                          <td className="py-1 text-center font-bold text-slate-900">{no}</td>
                          <td colSpan={3} className="py-1 px-2 font-bold text-slate-900">
                            {section.title}
                          </td>
                        </tr>,
                      );

                      let secCur = 0;
                      let secPrev = 0;
                      sectionAccounts.forEach((a) => {
                        const isHeader = a.entry_type === "Header";
                        const cur = computed.cur.get(a.id) ?? 0;
                        const prev = computed.prev.get(a.id) ?? 0;
                        if (!isHeader) {
                          secCur += cur;
                          secPrev += prev;
                        }
                        no += 1;
                        const depth = a.code.split(/[.\-]/).filter(Boolean).length;
                        const indent = Math.max(0, depth - 2) * 12;
                        rendered.push(
                          <tr
                            key={a.id}
                            className={cn("border-b border-slate-200", isHeader && "bg-slate-50")}
                          >
                            <td className="py-1 text-center text-slate-500">{no}</td>
                            <td
                              className={cn(
                                "py-1 px-2",
                                isHeader ? "font-semibold text-slate-900" : "text-slate-800",
                              )}
                              style={{ paddingLeft: 8 + indent }}
                            >
                              {a.name}
                            </td>
                            <td className="py-1 px-2 text-right tabular-nums text-slate-800 font-medium">
                              {formatRpOrDash(cur)}
                            </td>
                            <td className="py-1 px-2 text-right tabular-nums text-slate-800 font-medium">
                              {formatRpOrDash(prev)}
                            </td>
                          </tr>,
                        );
                      });

                      if (section.isExpense) {
                        totalExpenseCur += secCur;
                        totalExpensePrev += secPrev;
                      } else {
                        totalIncomeCur += secCur;
                        totalIncomePrev += secPrev;
                      }

                      no += 1;
                      rendered.push(
                        <tr
                          key={`t-${si}`}
                          className="border-y-2 border-slate-900 bg-slate-100"
                        >
                          <td className="py-1.5 text-center font-bold text-slate-900">{no}</td>
                          <td className="py-1.5 px-2 font-bold text-slate-900">{section.total}</td>
                          <td className="py-1.5 px-2 text-right font-bold text-slate-900 tabular-nums">
                            {formatRpOrDash(secCur)}
                          </td>
                          <td className="py-1.5 px-2 text-right font-bold text-slate-900 tabular-nums">
                            {formatRpOrDash(secPrev)}
                          </td>
                        </tr>,
                      );
                    }

                    if (rendered.length === 0) {
                      rendered.push(
                        <tr key="empty">
                          <td colSpan={4} className="py-10 text-center text-slate-500">
                            Belum ada transaksi pendapatan/beban pada periode ini.
                          </td>
                        </tr>,
                      );
                    }

                    rendered.push(
                      <tr
                        key="laba-bersih"
                        className="border-y-2 border-slate-900 bg-slate-200"
                      >
                        <td colSpan={2} className="py-2 px-2 font-bold text-slate-900">
                          LABA / (RUGI) BERSIH
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-slate-900 tabular-nums">
                          {formatRpOrDash(totalIncomeCur - totalExpenseCur)}
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-slate-900 tabular-nums">
                          {formatRpOrDash(totalIncomePrev - totalExpensePrev)}
                        </td>
                      </tr>,
                    );

                    return rendered;
                  })()}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground">
          Saldo akun dihitung otomatis dari jurnal yang terbentuk pada menu Catat Kegiatan.
        </p>
      </div>
    </>
  );
}
