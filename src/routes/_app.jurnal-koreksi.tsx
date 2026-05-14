import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileEdit, Search, ArrowRight, RefreshCcw } from "lucide-react";
import { PageHeader } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { JournalCorrectionWizard } from "@/components/JournalCorrectionWizard";

export const Route = createFileRoute("/_app/jurnal-koreksi")({
  component: () => <JurnalKoreksiPage />,
});

export function JurnalKoreksiPage({ prefix, title, subtitle }: { prefix?: string; title?: string; subtitle?: string } = {}) {

type Row = {
  id: string;
  transaction_date: string;
  transaction_type: string;
  description: string | null;
  total_amount: number;
  status: string;
  original_journal_id: string | null;
  correction_type: string | null;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);

function StatusBadge({ status }: { status: string }) {
  if (status === "Corrected") {
    return (
      <Badge variant="outline" className="border-amber-500/60 text-amber-300">
        Corrected
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-emerald-500/60 text-emerald-300">
      Posted
    </Badge>
  );
}

function CorrectionTypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  const labels: Record<string, string> = {
    reversal: "Pembalik",
    adjust_amount: "Koreksi Nominal",
    reclass: "Reklasifikasi",
    full_adjustment: "Koreksi Gabungan",
  };
  return (
    <Badge variant="outline" className="border-violet-500/60 text-violet-300">
      {labels[type] ?? type}
    </Badge>
  );
}

function JurnalKoreksiPage() {
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["journals-correctable"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select(
          "id,transaction_date,transaction_type,description,total_amount,status,original_journal_id,correction_type",
        )
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const correctionByOriginal = useMemo(() => {
    const map = new Map<string, Row>();
    for (const r of data ?? []) {
      if (r.original_journal_id) map.set(r.original_journal_id, r);
    }
    return map;
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter(
      (r) =>
        r.description?.toLowerCase().includes(q) ||
        r.transaction_type.toLowerCase().includes(q) ||
        r.id.slice(0, 8).toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <>
      <PageHeader
        title="Jurnal Koreksi"
        subtitle="Buat jurnal koreksi otomatis. Jurnal asli tetap tersimpan dan ditandai Corrected."
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <RefreshCcw className="h-3.5 w-3.5 mr-1" /> Muat ulang
          </Button>
        }
      />

      <div className="glass-card rounded-2xl border border-white/10 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari deskripsi, tipe transaksi, atau bukti..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead className="text-left text-muted-foreground border-b border-border/60">
              <tr>
                <th className="py-2 pr-2">Tanggal</th>
                <th className="py-2 pr-2">Bukti</th>
                <th className="py-2 pr-2">Tipe</th>
                <th className="py-2 pr-2">Deskripsi</th>
                <th className="py-2 pr-2 text-right">Total</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2 pr-2">Link</th>
                <th className="py-2 pr-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-muted-foreground">
                    Memuat...
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-muted-foreground">
                    Tidak ada jurnal.
                  </td>
                </tr>
              )}
              {filtered.map((r) => {
                const koreksiOf = r.original_journal_id;
                const correctedBy = correctionByOriginal.get(r.id);
                return (
                  <tr key={r.id} className="border-b border-border/40 hover:bg-secondary/30">
                    <td className="py-2 pr-2 whitespace-nowrap">{r.transaction_date}</td>
                    <td className="py-2 pr-2 font-mono text-[11px]">
                      {r.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-2 pr-2">
                      <div className="flex flex-wrap gap-1 items-center">
                        <span>{r.transaction_type}</span>
                        <CorrectionTypeBadge type={r.correction_type} />
                      </div>
                    </td>
                    <td className="py-2 pr-2 max-w-[260px] truncate" title={r.description ?? ""}>
                      {r.description ?? "-"}
                    </td>
                    <td className="py-2 pr-2 text-right whitespace-nowrap">
                      Rp {fmt(Number(r.total_amount))}
                    </td>
                    <td className="py-2 pr-2">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-2 pr-2 text-[11px]">
                      {koreksiOf && (
                        <span className="text-muted-foreground">
                          mengoreksi{" "}
                          <span className="font-mono">
                            {koreksiOf.slice(0, 8).toUpperCase()}
                          </span>
                        </span>
                      )}
                      {correctedBy && (
                        <span className="text-muted-foreground">
                          dikoreksi oleh{" "}
                          <span className="font-mono">
                            {correctedBy.id.slice(0, 8).toUpperCase()}
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={r.status === "Corrected"}
                        onClick={() => setActiveId(r.id)}
                      >
                        <FileEdit className="h-3.5 w-3.5 mr-1" />
                        Koreksi
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <JournalCorrectionWizard
        journalId={activeId}
        onClose={() => setActiveId(null)}
      />

      <p className="mt-3 text-[11px] text-muted-foreground">
        Tips: gunakan{" "}
        <Link to="/laporan-pusat" className="underline">
          Laporan Pusat
        </Link>{" "}
        untuk verifikasi dampak setelah koreksi.
      </p>
    </>
  );
}
