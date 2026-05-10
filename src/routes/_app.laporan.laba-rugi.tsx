import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ChevronRight, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { buildReportFilename, exportElementToPdf } from "@/lib/pdf-export";
import {
  type AccountLite,
  computeSignedBalances,
  formatRpOrDash,
  useAccountBalancesPeriod,
} from "@/lib/account-balances";

export const Route = createFileRoute("/_app/laporan/laba-rugi")({
  head: () => ({ meta: [{ title: "Laba Rugi · BUMDes" }] }),
  component: LabaRugiPage,
});

const SECTIONS: { title: string; type: string; total: string }[] = [
  { title: "PENDAPATAN", type: "PENDAPATAN", total: "TOTAL PENDAPATAN" },
  { title: "BEBAN", type: "BEBAN", total: "TOTAL BEBAN" },
];

function LabaRugiPage() {
  const year = new Date().getFullYear();
  const [start, setStart] = useState(`${year}-01-01`);
  const [end, setEnd] = useState(`${year}-12-31`);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const toggle = (k: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  const handleExport = async () => {
    if (!reportRef.current) return;
    try {
      setExporting(true);
      await exportElementToPdf(reportRef.current, buildReportFilename("Laporan Laba Rugi", `${start}_${end}`));
      toast.success("PDF berhasil diunduh");
    } catch (e) {
      toast.error("Gagal export PDF: " + (e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const prevStart = `${Number(start.slice(0, 4)) - 1}${start.slice(4)}`;
  const prevEnd = `${Number(end.slice(0, 4)) - 1}${end.slice(4)}`;

  const { data: accounts, isLoading: loadingAcc, error: errAcc } = useQuery({
    queryKey: ["coa_accounts", "laba-rugi"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coa_accounts")
        .select("id,code,name,type,entry_type,normal_balance,status")
        .eq("status", "Aktif")
        .in("type", ["PENDAPATAN", "BEBAN"])
        .order("code", { ascending: true })
        .limit(2000);
      if (error) throw error;
      return data as AccountLite[];
    },
  });

  const { data: balCur, isLoading: lc } = useAccountBalancesPeriod(start, end);
  const { data: balPrev, isLoading: lp } = useAccountBalancesPeriod(prevStart, prevEnd);

  const isLoading = loadingAcc || lc || lp;

  const computed = useMemo(() => {
    if (!accounts || !balCur || !balPrev) return null;
    const cur = computeSignedBalances(accounts, balCur);
    const prev = computeSignedBalances(accounts, balPrev);
    return { cur, prev };
  }, [accounts, balCur, balPrev]);

  return (
    <>
      <PageHeader
        title="Laporan Laba Rugi"
        subtitle="Pendapatan, beban, dan laba bersih · dihitung otomatis dari jurnal."
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
            <button className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] px-4 py-2 text-sm font-medium text-[oklch(0.15_0.03_250)] glow-cyan hover:opacity-90 transition">
              <Download className="h-4 w-4" />
              Export
            </button>
          </>
        }
      />

      <div className="glass-card rounded-2xl p-3 sm:p-5">
        <div className="overflow-x-auto rounded-xl border border-amber-200/40 bg-[oklch(0.96_0.04_85)] text-[oklch(0.2_0.02_50)] shadow-inner">
          <div className="min-w-[640px] p-4 sm:p-6 font-mono text-[13px]">
            <div className="text-center mb-4 leading-tight">
              <p className="text-[12px] uppercase tracking-wider text-[oklch(0.4_0.05_50)]">
                Laporan Laba Rugi BUM Desa
              </p>
              <p className="text-[14px] font-bold text-[oklch(0.55_0.18_25)]">Nama BUM Desa</p>
              <p className="text-[13px] font-bold text-[oklch(0.55_0.18_25)]">LAPORAN LABA RUGI</p>
              <p className="text-[11px] text-[oklch(0.4_0.05_50)]">
                Periode {start} s/d {end}
              </p>
              <p className="text-[11px] italic text-[oklch(0.4_0.05_50)]">dalam Rupiah</p>
            </div>

            {isLoading && (
              <div className="py-12 text-center text-[oklch(0.4_0.05_50)]">
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
                  <tr className="border-y-2 border-[oklch(0.55_0.18_25)] text-[oklch(0.55_0.18_25)] font-semibold">
                    <th className="w-12 py-1.5 text-center">No.</th>
                    <th className="text-left py-1.5 px-2">Uraian</th>
                    <th className="w-28 py-1.5 text-right px-2">Periode Ini</th>
                    <th className="w-28 py-1.5 text-right px-2">Periode Lalu</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let no = 0;
                    let pendCur = 0;
                    let pendPrev = 0;
                    let bebanCur = 0;
                    let bebanPrev = 0;

                    const rendered = SECTIONS.flatMap((section, si) => {
                      const rows: React.ReactNode[] = [];
                      no += 1;
                      const isOpen = expanded.has(section.type);
                      rows.push(
                        <tr
                          key={`s-${si}`}
                          className="bg-[oklch(0.92_0.05_85)] cursor-pointer hover:bg-[oklch(0.90_0.06_85)]"
                          onClick={() => toggle(section.type)}
                        >
                          <td className="py-1 text-center font-bold text-[oklch(0.55_0.18_25)]">{no}</td>
                          <td colSpan={3} className="py-1 px-2 font-bold text-[oklch(0.55_0.18_25)]">
                            <span className="inline-flex items-center gap-1">
                              <ChevronRight
                                className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-90")}
                              />
                              {section.title}
                            </span>
                          </td>
                        </tr>,
                      );

                      let secCur = 0;
                      let secPrev = 0;
                      const sectionAccounts = accounts.filter((a) => a.type === section.type);
                      sectionAccounts.forEach((a) => {
                        const isHeader = a.entry_type === "Header";
                        const cur = computed.cur.get(a.id) ?? 0;
                        const prev = computed.prev.get(a.id) ?? 0;
                        if (!isHeader) {
                          secCur += cur;
                          secPrev += prev;
                        }
                        if (!isOpen) return;
                        no += 1;
                        const depth = a.code.split(/[.\-]/).filter(Boolean).length;
                        const indent = Math.max(0, depth - 2) * 12;
                        rows.push(
                          <tr
                            key={a.id}
                            className={cn(
                              "border-b border-amber-200/60",
                              isHeader && "bg-[oklch(0.94_0.04_85)]",
                            )}
                          >
                            <td className="py-1 text-center text-[oklch(0.4_0.05_50)]">{no}</td>
                            <td
                              className={cn(
                                "py-1 px-2",
                                isHeader
                                  ? "font-semibold text-[oklch(0.55_0.18_25)]"
                                  : "text-[oklch(0.35_0.1_240)]",
                              )}
                              style={{ paddingLeft: 8 + indent }}
                            >
                              {a.name}
                            </td>
                            <td className="py-1 px-2 text-right tabular-nums text-[oklch(0.35_0.1_240)] font-medium">
                              {formatRpOrDash(cur)}
                            </td>
                            <td className="py-1 px-2 text-right tabular-nums text-[oklch(0.35_0.1_240)] font-medium">
                              {formatRpOrDash(prev)}
                            </td>
                          </tr>,
                        );
                      });

                      if (section.type === "PENDAPATAN") {
                        pendCur = secCur;
                        pendPrev = secPrev;
                      } else {
                        bebanCur = secCur;
                        bebanPrev = secPrev;
                      }

                      no += 1;
                      rows.push(
                        <tr
                          key={`t-${si}`}
                          className="border-y-2 border-[oklch(0.55_0.18_25)] bg-[oklch(0.92_0.05_85)]"
                        >
                          <td className="py-1.5 text-center font-bold text-[oklch(0.55_0.18_25)]">{no}</td>
                          <td className="py-1.5 px-2 font-bold text-[oklch(0.55_0.18_25)]">{section.total}</td>
                          <td className="py-1.5 px-2 text-right font-bold text-[oklch(0.55_0.18_25)] tabular-nums">
                            {formatRpOrDash(secCur)}
                          </td>
                          <td className="py-1.5 px-2 text-right font-bold text-[oklch(0.55_0.18_25)] tabular-nums">
                            {formatRpOrDash(secPrev)}
                          </td>
                        </tr>,
                      );

                      return rows;
                    });

                    rendered.push(
                      <tr
                        key="laba-bersih"
                        className="border-y-2 border-[oklch(0.55_0.18_25)] bg-[oklch(0.88_0.06_85)]"
                      >
                        <td colSpan={2} className="py-2 px-2 font-bold text-[oklch(0.55_0.18_25)]">
                          LABA / (RUGI) BERSIH
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-[oklch(0.55_0.18_25)] tabular-nums">
                          {formatRpOrDash(pendCur - bebanCur)}
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-[oklch(0.55_0.18_25)] tabular-nums">
                          {formatRpOrDash(pendPrev - bebanPrev)}
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
