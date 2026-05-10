import { createFileRoute } from "@tanstack/react-router";
import {
  Wallet,
  TrendingUp,
  CircleDollarSign,
  Building2,
  Download,
  ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { PageHeader } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [{ title: "Dashboard · Direktur BUMDes" }],
  }),
  component: DashboardPage,
});

const trendData = [
  { m: "Jan", v: 142 },
  { m: "Feb", v: 168 },
  { m: "Mar", v: 155 },
  { m: "Apr", v: 198 },
  { m: "Mei", v: 224 },
  { m: "Jun", v: 215 },
  { m: "Jul", v: 268 },
  { m: "Agu", v: 295 },
  { m: "Sep", v: 312 },
  { m: "Okt", v: 348 },
  { m: "Nov", v: 372 },
  { m: "Des", v: 410 },
];

const units = [
  { name: "Unit Air Bersih", revenue: "Rp 124,3 Jt", growth: "+12,4%", status: "Aktif" },
  { name: "Unit Pasar Desa", revenue: "Rp 98,7 Jt", growth: "+6,1%", status: "Aktif" },
  { name: "Unit Simpan Pinjam", revenue: "Rp 76,2 Jt", growth: "+18,9%", status: "Aktif" },
  { name: "Unit Wisata Desa", revenue: "Rp 54,8 Jt", growth: "-2,3%", status: "Aktif" },
];

function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard Direktur BUMDes"
        subtitle="Ringkasan eksekutif performa konsolidasi seluruh unit usaha."
        actions={
          <button className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/60 px-3.5 py-2 text-sm hover:border-[var(--neon-cyan)]/50 transition">
            <Download className="h-4 w-4" />
            Unduh Ringkasan
          </button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Aset Konsolidasi" value="Rp 4,82 M" delta="+8,3%" icon={Wallet} accent="cyan" />
        <StatCard label="Pendapatan Bulan Ini" value="Rp 412 Jt" delta="+11,7%" icon={TrendingUp} accent="green" />
        <StatCard label="Total Laba Bersih" value="Rp 138 Jt" delta="+6,4%" icon={CircleDollarSign} accent="cyan" />
        <StatCard label="Unit Usaha Aktif" value="07" delta="+1" icon={Building2} accent="green" />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="glass-card rounded-2xl p-5 lg:col-span-2">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Tren Pendapatan
              </p>
              <h2 className="mt-1 text-lg font-semibold">Tren Pendapatan Konsolidasi</h2>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--neon-green)]/40 bg-[var(--neon-green)]/10 px-2.5 py-1 text-xs text-[var(--neon-green)]">
              <ArrowUpRight className="h-3.5 w-3.5" /> +24% YoY
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ left: -20, top: 10, right: 10 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.85 0.18 195)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="oklch(0.85 0.18 195)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(0.6 0.05 230 / 0.12)" vertical={false} />
                <XAxis dataKey="m" stroke="oklch(0.7 0.02 230)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.7 0.02 230)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.18 0.03 250 / 0.95)",
                    border: "1px solid oklch(0.6 0.08 220 / 0.25)",
                    borderRadius: 12,
                    color: "oklch(0.97 0.01 220)",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`Rp ${v} Jt`, "Pendapatan"]}
                />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="oklch(0.85 0.18 195)"
                  strokeWidth={2.5}
                  fill="url(#grad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Performa Unit Usaha
          </p>
          <h2 className="mt-1 text-lg font-semibold">Top Unit Bulan Ini</h2>

          <ul className="mt-4 space-y-3">
            {units.map((u) => (
              <li
                key={u.name}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-background/30 px-3 py-2.5 hover:border-[var(--neon-cyan)]/40 transition"
              >
                <div>
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.revenue}</p>
                </div>
                <span
                  className={
                    "text-xs font-semibold " +
                    (u.growth.startsWith("-")
                      ? "text-destructive"
                      : "text-[var(--neon-green)]")
                  }
                >
                  {u.growth}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
