import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Download, Loader2 } from "lucide-react";
import { DashboardLayout, PageHeader } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/laporan/neraca-konsolidasi")({
  head: () => ({ meta: [{ title: "Neraca Konsolidasi · BUMDes" }] }),
  component: NeracaKonsolidasiPage,
});

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  entry_type: string;
  status: string;
};

const SECTIONS: { title: string; prefix: string; total: string }[] = [
  { title: "ASET", prefix: "1.", total: "TOTAL ASET" },
  { title: "KEWAJIBAN", prefix: "2.", total: "TOTAL KEWAJIBAN" },
  { title: "EKUITAS", prefix: "3.", total: "TOTAL EKUITAS" },
];

function NeracaKonsolidasiPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["coa_accounts", "neraca-konsolidasi"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coa_accounts")
        .select("id,code,name,type,entry_type,status")
        .eq("status", "Aktif")
        .in("type", ["ASET", "KEWAJIBAN", "EKUITAS"])
        .order("code", { ascending: true })
        .limit(1000);
      if (error) throw error;
      return data as Account[];
    },
  });

  const grouped = useMemo(() => {
    if (!data) return [];
    return SECTIONS.map((s) => ({
      ...s,
      rows: data.filter((a) => a.code.startsWith(s.prefix) && a.code !== `${s.prefix}0.00.00`),
    }));
  }, [data]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Laporan Posisi Keuangan Gabungan / Konsolidasian"
        subtitle="Format Konsolidasi BUM Desa · per 31 Desember 20X2 dan 20X1 (dalam Rupiah)"
        actions={
          <>
            <div className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/60 px-3 py-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                className="bg-transparent text-sm outline-none [color-scheme:dark]"
                defaultValue="2025-12-31"
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
                Contoh Format Laporan Posisi Keuangan Gabungan / Konsolidasian
              </p>
              <p className="text-[14px] font-bold text-[oklch(0.55_0.18_25)]">Nama BUM Desa</p>
              <p className="text-[13px] font-bold text-[oklch(0.55_0.18_25)]">
                LAPORAN POSISI KEUANGAN (NERACA)
              </p>
              <p className="text-[11px] text-[oklch(0.4_0.05_50)]">
                per Tanggal 31 Desember 20X2 dan 20X1
              </p>
              <p className="text-[11px] italic text-[oklch(0.4_0.05_50)]">dalam Rupiah</p>
            </div>

            {isLoading && (
              <div className="py-12 text-center text-[oklch(0.4_0.05_50)]">
                <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                Memuat data dari Bagan Akun...
              </div>
            )}
            {error && (
              <div className="py-8 text-center text-rose-600">
                Gagal memuat: {(error as Error).message}
              </div>
            )}

            {!isLoading && !error && (
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="border-y-2 border-[oklch(0.55_0.18_25)] text-[oklch(0.55_0.18_25)] font-semibold">
                    <th className="w-12 py-1.5 text-center">No.</th>
                    <th className="text-left py-1.5 px-2">Uraian</th>
                    <th className="w-24 py-1.5 text-right px-2">20X2</th>
                    <th className="w-24 py-1.5 text-right px-2">20X1</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let no = 0;
                    return grouped.flatMap((section, si) => {
                      const sectionRows: React.ReactNode[] = [];
                      no += 1;
                      sectionRows.push(
                        <tr key={`s-${si}`} className="bg-[oklch(0.92_0.05_85)]">
                          <td className="py-1 text-center font-bold text-[oklch(0.55_0.18_25)]">
                            {no}
                          </td>
                          <td
                            colSpan={3}
                            className="py-1 px-2 font-bold text-[oklch(0.55_0.18_25)]"
                          >
                            {section.title}
                          </td>
                        </tr>,
                      );

                      section.rows.forEach((a) => {
                        no += 1;
                        const isHeader = a.entry_type === "Header";
                        const depth = a.code.split(/[.\-]/).filter(Boolean).length;
                        const indent = Math.max(0, depth - 2) * 12;
                        sectionRows.push(
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
                            <td className="py-1 px-2 text-right text-[oklch(0.35_0.1_240)] font-medium">
                              XXX
                            </td>
                            <td className="py-1 px-2 text-right text-[oklch(0.35_0.1_240)] font-medium">
                              XXX
                            </td>
                          </tr>,
                        );
                      });

                      no += 1;
                      sectionRows.push(
                        <tr
                          key={`t-${si}`}
                          className="border-y-2 border-[oklch(0.55_0.18_25)] bg-[oklch(0.92_0.05_85)]"
                        >
                          <td className="py-1.5 text-center font-bold text-[oklch(0.55_0.18_25)]">
                            {no}
                          </td>
                          <td className="py-1.5 px-2 font-bold text-[oklch(0.55_0.18_25)]">
                            {section.total}
                          </td>
                          <td className="py-1.5 px-2 text-right font-bold text-[oklch(0.55_0.18_25)]">
                            XXX
                          </td>
                          <td className="py-1.5 px-2 text-right font-bold text-[oklch(0.55_0.18_25)]">
                            XXX
                          </td>
                        </tr>,
                      );

                      return sectionRows;
                    });
                  })()}

                  {!isLoading && grouped.length > 0 && (
                    <tr className="border-y-2 border-[oklch(0.55_0.18_25)] bg-[oklch(0.88_0.06_85)]">
                      <td colSpan={2} className="py-2 px-2 font-bold text-[oklch(0.55_0.18_25)]">
                        TOTAL KEWAJIBAN DAN EKUITAS
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-[oklch(0.55_0.18_25)]">
                        XXX
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-[oklch(0.55_0.18_25)]">
                        XXX
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground">
          Data konsolidasi gabungan kantor pusat dan seluruh unit usaha. Struktur akun mengikuti
          Bagan Akun aktif (Kepmendesa No. 136/2022).
        </p>
      </div>
    </DashboardLayout>
  );
}
