import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ChevronRight, Download, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  type AccountLite,
  computeSignedBalances,
  formatRpOrDash,
  sumByType,
  useAccountBalances,
} from "@/lib/account-balances";

const SECTIONS: { title: string; type: string; total: string }[] = [
  { title: "ASET", type: "ASET", total: "TOTAL ASET" },
  { title: "KEWAJIBAN", type: "KEWAJIBAN", total: "TOTAL KEWAJIBAN" },
  { title: "EKUITAS", type: "EKUITAS", total: "TOTAL EKUITAS" },
];

const yearEnd = (year: number) => `${year}-12-31`;

export function NeracaSheet({
  title,
  subtitle,
  heading,
}: {
  title: string;
  subtitle: string;
  heading: { line1: string; line2?: string; line3: string };
}) {
  const [asOf, setAsOf] = useState(yearEnd(new Date().getFullYear()));
  const currentYear = Number(asOf.slice(0, 4));
  const prevAsOf = yearEnd(currentYear - 1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (k: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  const { data: accounts, isLoading: loadingAcc, error: errAcc } = useQuery({
    queryKey: ["coa_accounts", "neraca-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coa_accounts")
        .select("id,code,name,type,entry_type,normal_balance,status")
        .eq("status", "Aktif")
        .in("type", ["ASET", "KEWAJIBAN", "EKUITAS", "PENDAPATAN", "BEBAN"])
        .order("code", { ascending: true })
        .limit(2000);
      if (error) throw error;
      return data as AccountLite[];
    },
  });

  const { data: balCur, isLoading: loadingCur } = useAccountBalances(asOf);
  const { data: balPrev, isLoading: loadingPrev } = useAccountBalances(prevAsOf);

  const isLoading = loadingAcc || loadingCur || loadingPrev;
  const error = errAcc;

  const computed = useMemo(() => {
    if (!accounts || !balCur || !balPrev) return null;
    const signedCur = computeSignedBalances(accounts, balCur);
    const signedPrev = computeSignedBalances(accounts, balPrev);
    // Laba tahun berjalan = pendapatan - beban
    const labaCur = sumByType(accounts, signedCur, ["PENDAPATAN"]) - sumByType(accounts, signedCur, ["BEBAN"]);
    const labaPrev = sumByType(accounts, signedPrev, ["PENDAPATAN"]) - sumByType(accounts, signedPrev, ["BEBAN"]);

    const neracaAccounts = accounts.filter((a) => ["ASET", "KEWAJIBAN", "EKUITAS"].includes(a.type));
    return { signedCur, signedPrev, labaCur, labaPrev, neracaAccounts };
  }, [accounts, balCur, balPrev]);

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
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
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
              <p className="text-[12px] uppercase tracking-wider text-[oklch(0.4_0.05_50)]">{heading.line1}</p>
              <p className="text-[14px] font-bold text-[oklch(0.55_0.18_25)]">Nama BUM Desa</p>
              {heading.line2 && (
                <p className="text-[13px] font-semibold text-[oklch(0.55_0.18_25)]">{heading.line2}</p>
              )}
              <p className="text-[13px] font-bold text-[oklch(0.55_0.18_25)]">{heading.line3}</p>
              <p className="text-[11px] text-[oklch(0.4_0.05_50)]">
                per {asOf} dan {prevAsOf}
              </p>
              <p className="text-[11px] italic text-[oklch(0.4_0.05_50)]">dalam Rupiah</p>
            </div>

            {isLoading && (
              <div className="py-12 text-center text-[oklch(0.4_0.05_50)]">
                <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                Memuat data laporan...
              </div>
            )}
            {error && (
              <div className="py-8 text-center text-rose-600">
                Gagal memuat: {(error as Error).message}
              </div>
            )}

            {!isLoading && !error && computed && (
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="border-y-2 border-[oklch(0.55_0.18_25)] text-[oklch(0.55_0.18_25)] font-semibold">
                    <th className="w-12 py-1.5 text-center">No.</th>
                    <th className="text-left py-1.5 px-2">Uraian</th>
                    <th className="w-28 py-1.5 text-right px-2">{currentYear}</th>
                    <th className="w-28 py-1.5 text-right px-2">{currentYear - 1}</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let no = 0;
                    let totalAsetCur = 0;
                    let totalAsetPrev = 0;
                    let totalKewajibanCur = 0;
                    let totalKewajibanPrev = 0;
                    let totalEkuitasCur = 0;
                    let totalEkuitasPrev = 0;

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

                      const sectionAccounts = computed.neracaAccounts.filter((a) => a.type === section.type);
                      let secCur = 0;
                      let secPrev = 0;
                      sectionAccounts.forEach((a) => {
                        const isHeader = a.entry_type === "Header";
                        const cur = computed.signedCur.get(a.id) ?? 0;
                        const prev = computed.signedPrev.get(a.id) ?? 0;
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
                            <td className="py-1 px-2 text-right text-[oklch(0.35_0.1_240)] font-medium tabular-nums">
                              {formatRpOrDash(cur)}
                            </td>
                            <td className="py-1 px-2 text-right text-[oklch(0.35_0.1_240)] font-medium tabular-nums">
                              {formatRpOrDash(prev)}
                            </td>
                          </tr>,
                        );
                      });

                      // Tambah Laba Tahun Berjalan ke EKUITAS
                      if (section.type === "EKUITAS") {
                        secCur += computed.labaCur;
                        secPrev += computed.labaPrev;
                        if (isOpen) {
                          no += 1;
                          rows.push(
                          <tr key="laba-berjalan" className="border-b border-amber-200/60">
                            <td className="py-1 text-center text-[oklch(0.4_0.05_50)]">{no}</td>
                            <td className="py-1 px-2 italic text-[oklch(0.35_0.1_240)]" style={{ paddingLeft: 20 }}>
                              Laba / (Rugi) Tahun Berjalan
                            </td>
                            <td className="py-1 px-2 text-right tabular-nums text-[oklch(0.35_0.1_240)] font-medium">
                              {formatRpOrDash(computed.labaCur)}
                            </td>
                            <td className="py-1 px-2 text-right tabular-nums text-[oklch(0.35_0.1_240)] font-medium">
                              {formatRpOrDash(computed.labaPrev)}
                            </td>
                          </tr>,
                          );
                        }
                      }

                      if (section.type === "ASET") {
                        totalAsetCur = secCur;
                        totalAsetPrev = secPrev;
                      } else if (section.type === "KEWAJIBAN") {
                        totalKewajibanCur = secCur;
                        totalKewajibanPrev = secPrev;
                      } else {
                        totalEkuitasCur = secCur;
                        totalEkuitasPrev = secPrev;
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
                        key="grand-total"
                        className="border-y-2 border-[oklch(0.55_0.18_25)] bg-[oklch(0.88_0.06_85)]"
                      >
                        <td colSpan={2} className="py-2 px-2 font-bold text-[oklch(0.55_0.18_25)]">
                          TOTAL KEWAJIBAN DAN EKUITAS
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-[oklch(0.55_0.18_25)] tabular-nums">
                          {formatRpOrDash(totalKewajibanCur + totalEkuitasCur)}
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-[oklch(0.55_0.18_25)] tabular-nums">
                          {formatRpOrDash(totalKewajibanPrev + totalEkuitasPrev)}
                        </td>
                      </tr>,
                    );

                    void totalAsetCur;
                    void totalAsetPrev;

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
