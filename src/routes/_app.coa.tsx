import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Loader2 } from "lucide-react";
import { DashboardLayout, PageHeader } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/coa")({
  head: () => ({ meta: [{ title: "Bagan Akun · BUMDes" }] }),
  component: CoaPage,
});

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  normal_balance: string;
  entry_type: string;
  status: string;
};

const TYPE_COLORS: Record<string, string> = {
  ASET: "text-[var(--neon-cyan)]",
  KEWAJIBAN: "text-amber-400",
  EKUITAS: "text-fuchsia-400",
  PENDAPATAN: "text-[var(--neon-green)]",
  BEBAN: "text-rose-400",
  BEBAN_LAIN: "text-rose-300",
};

function CoaPage() {
  const [q, setQ] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["coa_accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coa_accounts")
        .select("*")
        .order("code", { ascending: true })
        .limit(1000);
      if (error) throw error;
      return data as Account[];
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data.filter(
      (a) =>
        a.code.toLowerCase().includes(term) ||
        a.name.toLowerCase().includes(term) ||
        a.type.toLowerCase().includes(term),
    );
  }, [data, q]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Bagan Akun (Chart of Accounts)"
        subtitle={`Kepmendesa No. 136 Tahun 2022 · ${data?.length ?? 0} akun terdaftar`}
      />

      <div className="glass-card rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 min-w-[240px] items-center gap-2 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari kode, nama akun, atau tipe..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            />
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] px-4 py-2 text-sm font-medium text-[oklch(0.15_0.03_250)] glow-cyan hover:opacity-90 transition">
            <Plus className="h-4 w-4" />
            Tambah Akun
          </button>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-background/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground sticky top-0">
                <th className="px-4 py-3 font-medium">Kode</th>
                <th className="px-4 py-3 font-medium">Nama Akun</th>
                <th className="px-4 py-3 font-medium">Tipe</th>
                <th className="px-4 py-3 font-medium">Saldo Normal</th>
                <th className="px-4 py-3 font-medium">Jenis</th>
                <th className="px-4 py-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                    Memuat bagan akun...
                  </td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-destructive">
                    Gagal memuat data: {(error as Error).message}
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && !error && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Tidak ada akun yang cocok.
                  </td>
                </tr>
              )}
              {filtered.map((a) => (
                <tr
                  key={a.id}
                  className={cn(
                    "border-t border-border/60 transition hover:bg-secondary/30",
                    a.entry_type === "Header" && "bg-background/20",
                  )}
                >
                  <td className="px-4 py-2.5 font-mono text-[var(--neon-cyan)] whitespace-nowrap">
                    {a.code}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2.5",
                      a.entry_type === "Header" && "font-semibold",
                    )}
                  >
                    {a.name}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2.5 text-xs font-medium",
                      TYPE_COLORS[a.type] ?? "text-muted-foreground",
                    )}
                  >
                    {a.type}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {a.normal_balance}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {a.entry_type}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                        a.status === "Aktif"
                          ? "bg-[var(--neon-green)]/10 text-[var(--neon-green)] border border-[var(--neon-green)]/30"
                          : "bg-muted text-muted-foreground border border-border/60",
                      )}
                    >
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
