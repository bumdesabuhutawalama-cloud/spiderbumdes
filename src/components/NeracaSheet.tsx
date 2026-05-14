import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Calendar, CheckCircle2, Download, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { buildReportFilename, exportElementToPdf } from "@/lib/pdf-export";
import { toast } from "sonner";
import {
  type AccountLite,
  type UnitMode,
  computeActiveAccountIds,
  computeSignedBalances,
  formatRpOrDash,
  sumByType,
  useAccountBalances,
} from "@/lib/account-balances";

type Unit = { id: string; name: string; code: string | null };

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
  defaultMode = "pusat",
  lockMode = false,
  fixedUnitCode,
}: {
  title: string;
  subtitle: string;
  heading: { line1: string; line2?: string; line3: string };
  defaultMode?: UnitMode;
  lockMode?: boolean;
  fixedUnitCode?: string;
}) {
  const [asOf, setAsOf] = useState(yearEnd(new Date().getFullYear()));
  const currentYear = Number(asOf.slice(0, 4));
  const prevAsOf = yearEnd(currentYear - 1);
  const effectiveLockMode = lockMode || !!fixedUnitCode;
  const [mode, setMode] = useState<UnitMode>(fixedUnitCode ? "unit" : defaultMode);
  const [unitId, setUnitId] = useState<string>("");
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (!reportRef.current) return;
    try {
      setExporting(true);
      await exportElementToPdf(reportRef.current, buildReportFilename(title, asOf));
      toast.success("PDF berhasil diunduh");
    } catch (e) {
      toast.error("Gagal export PDF: " + (e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const { data: units } = useQuery({
    queryKey: ["units", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id,name,code")
        .eq("status", "Aktif")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Unit[];
    },
  });

  const { data: accountsRaw, isLoading: loadingAcc, error: errAcc } = useQuery({
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

  const { data: rkAccountIds } = useQuery({
    queryKey: ["entity_rk_account_ids"],
    queryFn: async () => {
      const { data, error } = await supabase.from("entity_rk_accounts").select("account_id");
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.account_id as string));
    },
  });

  // Eliminasi akun RK saat mode konsolidasi
  const accounts = useMemo(() => {
    if (!accountsRaw) return accountsRaw;
    if (mode !== "konsolidasi" || !rkAccountIds) return accountsRaw;
    return accountsRaw.filter((a) => !rkAccountIds.has(a.id));
  }, [accountsRaw, mode, rkAccountIds]);

  const fixedUnit = fixedUnitCode
    ? (units ?? []).find((u) => u.id === fixedUnitCode || (u as { code?: string }).code === fixedUnitCode)
    : null;
  const effectiveUnitId = fixedUnitCode
    ? fixedUnit?.id ?? null
    : mode === "unit"
      ? unitId || null
      : null;
  const { data: balCur, isLoading: loadingCur } = useAccountBalances(asOf, mode, effectiveUnitId);
  const { data: balPrev, isLoading: loadingPrev } = useAccountBalances(prevAsOf, mode, effectiveUnitId);

  const isLoading = loadingAcc || loadingCur || loadingPrev;
  const error = errAcc;

  const computed = useMemo(() => {
    if (!accounts || !balCur || !balPrev) return null;
    const signedCur = computeSignedBalances(accounts, balCur);
    const signedPrev = computeSignedBalances(accounts, balPrev);
    const activeIds = computeActiveAccountIds(
      accounts,
      [balCur, balPrev],
      [signedCur, signedPrev],
    );
    // Laba tahun berjalan = pendapatan - beban
    const labaCur = sumByType(accounts, signedCur, ["PENDAPATAN"]) - sumByType(accounts, signedCur, ["BEBAN"]);
    const labaPrev = sumByType(accounts, signedPrev, ["PENDAPATAN"]) - sumByType(accounts, signedPrev, ["BEBAN"]);

    const neracaAccounts = accounts.filter((a) => ["ASET", "KEWAJIBAN", "EKUITAS"].includes(a.type));

    // Pada laporan Pusat: akun RK antar unit tetap ditampilkan sebagai histori,
    // namun nilainya dieliminasi dari total neraca (informational only).
    const excludeRkFromTotals = mode === "pusat" && !!rkAccountIds;
    const totalsAccounts = excludeRkFromTotals
      ? accounts.filter((a) => !rkAccountIds!.has(a.id))
      : accounts;

    // Validasi persamaan akuntansi: Aset = Kewajiban + Ekuitas (+ Laba berjalan)
    const totAset = sumByType(totalsAccounts, signedCur, ["ASET"]);
    const totKew = sumByType(totalsAccounts, signedCur, ["KEWAJIBAN"]);
    const totEku = sumByType(totalsAccounts, signedCur, ["EKUITAS"]) + labaCur;
    const diff = totAset - (totKew + totEku);
    const isBalanced = Math.abs(diff) < 0.5;

    return { signedCur, signedPrev, labaCur, labaPrev, neracaAccounts, activeIds, totalsAccounts, totAset, totKew, totEku, diff, isBalanced, isRk: (id: string) => excludeRkFromTotals && rkAccountIds!.has(id) };
  }, [accounts, balCur, balPrev, mode, rkAccountIds]);

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <>
            {!effectiveLockMode && (
              <div className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-secondary/60 p-1 text-xs">
                {(["pusat", "unit", "konsolidasi"] as UnitMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cn(
                      "rounded-md px-2.5 py-1 transition",
                      mode === m
                        ? "bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)]"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {m === "pusat" ? "Pusat" : m === "unit" ? "Unit" : "Konsolidasi"}
                  </button>
                ))}
              </div>
            )}
            {!effectiveLockMode && mode === "unit" && (
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="rounded-lg border border-border/60 bg-secondary/60 px-3 py-2 text-sm outline-none"
              >
                <option value="">Pilih unit…</option>
                {(units ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            )}
            <div className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/60 px-3 py-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
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
        <div ref={reportRef} className="overflow-x-auto rounded-xl border border-amber-200/40 bg-[oklch(0.96_0.04_85)] text-[oklch(0.2_0.02_50)] shadow-inner">
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
              <div className="space-y-2 py-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-5 w-full animate-pulse rounded bg-[oklch(0.9_0.04_85)]"
                    style={{ width: `${60 + ((i * 7) % 35)}%` }}
                  />
                ))}
              </div>
            )}
            {error && (
              <div className="py-8 text-center text-rose-600">
                Gagal memuat: {(error as Error).message}
              </div>
            )}

            {!isLoading && !error && computed && !computed.isBalanced && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <div className="font-semibold">Neraca tidak seimbang</div>
                  <div className="text-[11px]">
                    Selisih: {formatRpOrDash(computed.diff)} (Aset {formatRpOrDash(computed.totAset)} ≠ Kewajiban + Ekuitas {formatRpOrDash(computed.totKew + computed.totEku)})
                  </div>
                </div>
              </div>
            )}
            {!isLoading && !error && computed && computed.isBalanced && (
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11px] text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Neraca seimbang (Aset = Kewajiban + Ekuitas)
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
                      rows.push(
                        <tr key={`s-${si}`} className="bg-[oklch(0.92_0.05_85)]">
                          <td className="py-1 text-center font-bold text-[oklch(0.55_0.18_25)]">{no}</td>
                          <td colSpan={3} className="py-1 px-2 font-bold text-[oklch(0.55_0.18_25)]">
                            {section.title}
                          </td>
                        </tr>,
                      );

                      const sectionAccounts = computed.neracaAccounts.filter(
                        (a) => a.type === section.type && computed.activeIds.has(a.id),
                      );
                      // Total per seksi memakai sumByType agar akun kontra dikurangkan dengan benar.
                      let secCur = sumByType(accounts ?? [], computed.signedCur, [section.type]);
                      let secPrev = sumByType(accounts ?? [], computed.signedPrev, [section.type]);
                      sectionAccounts.forEach((a) => {
                        const isHeader = a.entry_type === "Header";
                        const cur = computed.signedCur.get(a.id) ?? 0;
                        const prev = computed.signedPrev.get(a.id) ?? 0;
                        
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
                        {
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
