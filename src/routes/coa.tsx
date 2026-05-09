import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { DashboardLayout, PageHeader } from "@/components/DashboardLayout";

export const Route = createFileRoute("/coa")({
  head: () => ({ meta: [{ title: "Bagan Akun · BUMDes" }] }),
  component: CoaPage,
});

const accounts = [
  { code: "1-1100", name: "Kas", type: "Aset Lancar", balance: "Rp 142.500.000" },
  { code: "1-1200", name: "Bank BRI", type: "Aset Lancar", balance: "Rp 1.284.300.000" },
  { code: "1-1300", name: "Piutang Usaha", type: "Aset Lancar", balance: "Rp 86.200.000" },
  { code: "1-2100", name: "Tanah & Bangunan", type: "Aset Tetap", balance: "Rp 2.450.000.000" },
  { code: "2-1100", name: "Hutang Usaha", type: "Liabilitas", balance: "Rp 134.800.000" },
  { code: "3-1000", name: "Modal Disetor Desa", type: "Ekuitas", balance: "Rp 3.000.000.000" },
  { code: "4-1100", name: "Pendapatan Unit Air", type: "Pendapatan", balance: "Rp 124.300.000" },
  { code: "5-1100", name: "Beban Operasional", type: "Beban", balance: "Rp 78.900.000" },
];

function CoaPage() {
  return (
    <DashboardLayout>
      <PageHeader
        title="Bagan Akun (Chart of Accounts)"
        subtitle="Struktur kode rekening pusat dan seluruh unit usaha BUMDes."
      />

      <div className="glass-card rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 min-w-[240px] items-center gap-2 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Cari kode atau nama akun..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            />
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] px-4 py-2 text-sm font-medium text-[oklch(0.15_0.03_250)] glow-cyan hover:opacity-90 transition">
            <Plus className="h-4 w-4" />
            Tambah Akun
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-background/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Kode</th>
                <th className="px-4 py-3 font-medium">Nama Akun</th>
                <th className="px-4 py-3 font-medium">Kategori</th>
                <th className="px-4 py-3 font-medium text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr
                  key={a.code}
                  className="border-t border-border/60 transition hover:bg-secondary/30"
                >
                  <td className="px-4 py-3 font-mono text-[var(--neon-cyan)]">{a.code}</td>
                  <td className="px-4 py-3">{a.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.type}</td>
                  <td className="px-4 py-3 text-right font-medium">{a.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
