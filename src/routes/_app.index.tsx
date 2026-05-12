import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { supabase } from "@/integrations/supabase/client";
import {
  useAccountBalances,
  useAccountBalancesPeriod,
  computeSignedBalances,
  sumByType,
  formatRp,
  type AccountLite,
} from "@/lib/account-balances";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [{ title: "Dashboard · Direktur BUMDes" }],
  }),
  component: DashboardPage,
});

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function lastDayOfMonth(year: number, month1: number) {
  return new Date(year, month1, 0).getDate();
}

function formatCompactRp(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
  if (abs >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} Jt`;
  if (abs >= 1_000) return `Rp ${(n / 1_000).toFixed(0)} Rb`;
  return `Rp ${Math.round(n)}`;
}

function DashboardPage() {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const monthStart = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`;

  // Master COA — needed to map signed balances by type.
  const { data: accountsRaw } = useQuery({
    queryKey: ["coa_accounts_dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coa_accounts")
        .select("id, code, name, type, entry_type, normal_balance");
      if (error) throw error;
      return (data ?? []) as AccountLite[];
    },
  });

  // Akun RK antar-entitas dieliminasi pada konsolidasi (samakan dengan Neraca Konsolidasi).
  const { data: rkAccountIds } = useQuery({
    queryKey: ["entity_rk_account_ids_dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase.from("entity_rk_accounts").select("account_id");
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.account_id as string));
    },
  });

  const accounts = useMemo(() => {
    if (!accountsRaw) return accountsRaw;
    if (!rkAccountIds) return accountsRaw;
    return accountsRaw.filter((a) => !rkAccountIds.has(a.id));
  }, [accountsRaw, rkAccountIds]);

  // Konsolidasi: mode 'pusat' (default) memakai semua jurnal tanpa filter unit.
  const { data: balAsOf } = useAccountBalances(todayStr, "pusat");
  const { data: balMonth } = useAccountBalancesPeriod(monthStart, todayStr, "pusat");
  const { data: balAllTime } = useAccountBalancesPeriod(undefined, todayStr, "pusat");

  // Bulan lalu (untuk delta pendapatan)
  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevStart = `${prevMonthDate.getFullYear()}-${pad(prevMonthDate.getMonth() + 1)}-01`;
  const prevEnd = `${prevMonthDate.getFullYear()}-${pad(prevMonthDate.getMonth() + 1)}-${pad(
    lastDayOfMonth(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1),
  )}`;
  const { data: balPrevMonth } = useAccountBalancesPeriod(prevStart, prevEnd, "pusat");

  // Aset, pendapatan, laba bersih
  const totalAset = useMemo(() => {
    if (!accounts || !balAsOf) return 0;
    const signed = computeSignedBalances(accounts, balAsOf);
    return sumByType(accounts, signed, ["ASET"]);
  }, [accounts, balAsOf]);

  const pendapatanBulan = useMemo(() => {
    if (!accounts || !balMonth) return 0;
    const signed = computeSignedBalances(accounts, balMonth);
    return sumByType(accounts, signed, ["PENDAPATAN"]);
  }, [accounts, balMonth]);

  const pendapatanBulanLalu = useMemo(() => {
    if (!accounts || !balPrevMonth) return 0;
    const signed = computeSignedBalances(accounts, balPrevMonth);
    return sumByType(accounts, signed, ["PENDAPATAN"]);
  }, [accounts, balPrevMonth]);

  const labaBersih = useMemo(() => {
    if (!accounts || !balAllTime) return 0;
    const signed = computeSignedBalances(accounts, balAllTime);
    const pendapatan = sumByType(accounts, signed, ["PENDAPATAN"]);
    const beban = sumByType(accounts, signed, ["BEBAN"]);
    return pendapatan - beban;
  }, [accounts, balAllTime]);

  // Unit usaha aktif
  const { data: unitsActive } = useQuery({
    queryKey: ["units_active_count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("units")
        .select("id", { count: "exact", head: true })
        .eq("status", "Aktif")
        .eq("is_pusat", false);
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Tren pendapatan konsolidasi 12 bulan terakhir (dari journal lines)
  const trendStart = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`;
  const trendStartDate = new Date(today.getFullYear(), today.getMonth() - 11, 1);
  const trendStartStr = `${trendStartDate.getFullYear()}-${pad(trendStartDate.getMonth() + 1)}-01`;

  const { data: trendData } = useQuery({
    enabled: !!accounts,
    queryKey: ["revenue_trend_12m", trendStartStr, trendStart],
    queryFn: async () => {
      const pendapatanIds = (accounts ?? [])
        .filter((a) => a.type === "PENDAPATAN" && a.entry_type !== "Header")
        .map((a) => a.id);
      if (pendapatanIds.length === 0) {
        return MONTH_LABELS.map((m) => ({ m, v: 0 }));
      }
      // Build 12 month buckets
      const buckets = new Map<string, number>();
      for (let i = 0; i < 12; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1);
        buckets.set(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`, 0);
      }
      const endStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(
        lastDayOfMonth(today.getFullYear(), today.getMonth() + 1),
      )}`;

      // Batch account ids (in clause limit ~1000 — pendapatan list will be small)
      const { data, error } = await supabase
        .from("journal_entry_lines")
        .select("debit, credit, journal_entries!inner(transaction_date)")
        .in("account_id", pendapatanIds)
        .gte("journal_entries.transaction_date", trendStartStr)
        .lte("journal_entries.transaction_date", endStr)
        .limit(50000);
      if (error) throw error;

      type Row = {
        debit: number | string;
        credit: number | string;
        journal_entries: { transaction_date: string } | { transaction_date: string }[] | null;
      };
      for (const r of (data ?? []) as Row[]) {
        const je = Array.isArray(r.journal_entries) ? r.journal_entries[0] : r.journal_entries;
        if (!je?.transaction_date) continue;
        const key = je.transaction_date.slice(0, 7);
        const debit = typeof r.debit === "number" ? r.debit : Number(r.debit) || 0;
        const credit = typeof r.credit === "number" ? r.credit : Number(r.credit) || 0;
        // Pendapatan normal kredit — nilai positif = kredit - debit
        buckets.set(key, (buckets.get(key) ?? 0) + (credit - debit));
      }
      return Array.from(buckets.entries()).map(([key, v]) => {
        const [, mm] = key.split("-");
        return { m: MONTH_LABELS[Number(mm) - 1], v };
      });
    },
  });

  const revenueDelta = (() => {
    if (!pendapatanBulanLalu || pendapatanBulanLalu === 0) return null;
    const pct = ((pendapatanBulan - pendapatanBulanLalu) / pendapatanBulanLalu) * 100;
    return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
  })();

  const yoyPct = (() => {
    if (!trendData || trendData.length < 2) return null;
    const last = trendData[trendData.length - 1].v;
    const first = trendData[0].v;
    if (!first) return null;
    const pct = ((last - first) / first) * 100;
    return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
  })();

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
        <StatCard
          label="Total Aset Konsolidasi"
          value={formatCompactRp(totalAset)}
          icon={Wallet}
          accent="cyan"
        />
        <StatCard
          label="Pendapatan Bulan Ini"
          value={formatCompactRp(pendapatanBulan)}
          delta={revenueDelta ?? undefined}
          icon={TrendingUp}
          accent="green"
        />
        <StatCard
          label="Total Laba Bersih"
          value={formatCompactRp(labaBersih)}
          icon={CircleDollarSign}
          accent="cyan"
        />
        <StatCard
          label="Unit Usaha Aktif"
          value={pad(unitsActive ?? 0)}
          icon={Building2}
          accent="green"
        />
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
            {yoyPct && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--neon-green)]/40 bg-[var(--neon-green)]/10 px-2.5 py-1 text-xs text-[var(--neon-green)]">
                <ArrowUpRight className="h-3.5 w-3.5" /> {yoyPct} 12 bln
              </span>
            )}
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData ?? []} margin={{ left: -20, top: 10, right: 10 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.85 0.18 195)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="oklch(0.85 0.18 195)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(0.6 0.05 230 / 0.12)" vertical={false} />
                <XAxis dataKey="m" stroke="oklch(0.7 0.02 230)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="oklch(0.7 0.02 230)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => formatCompactRp(v).replace("Rp ", "")}
                />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.18 0.03 250 / 0.95)",
                    border: "1px solid oklch(0.6 0.08 220 / 0.25)",
                    borderRadius: 12,
                    color: "oklch(0.97 0.01 220)",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [formatRp(v), "Pendapatan"]}
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

        <UnitPerformanceCard />
      </section>
    </>
  );
}

function UnitPerformanceCard() {
  const today = new Date();
  const monthStart = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`;
  const todayStr = today.toISOString().slice(0, 10);

  const { data: units } = useQuery({
    queryKey: ["units_top_perf"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, name, status, is_pusat")
        .eq("status", "Aktif")
        .eq("is_pusat", false);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: accounts } = useQuery({
    queryKey: ["coa_accounts_dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coa_accounts")
        .select("id, code, name, type, entry_type, normal_balance");
      if (error) throw error;
      return (data ?? []) as AccountLite[];
    },
  });

  const { data: unitRevenues } = useQuery({
    enabled: !!units && !!accounts && units.length > 0,
    queryKey: ["unit_revenues_month", monthStart, todayStr, units?.map((u) => u.id).join(",")],
    queryFn: async () => {
      const pendapatanIds = (accounts ?? [])
        .filter((a) => a.type === "PENDAPATAN" && a.entry_type !== "Header")
        .map((a) => a.id);

      const results = await Promise.all(
        (units ?? []).map(async (u) => {
          // Cari jurnal milik unit ini
          const [{ data: unitRow }, { data: rk }] = await Promise.all([
            supabase.from("units").select("kas_account_id").eq("id", u.id).maybeSingle(),
            supabase.from("entity_rk_accounts").select("account_id").eq("owner_entity_id", u.id),
          ]);
          const owned = new Set<string>();
          if (unitRow?.kas_account_id) owned.add(unitRow.kas_account_id as string);
          for (const r of rk ?? []) owned.add((r as { account_id: string }).account_id);
          if (owned.size === 0) return { id: u.id, name: u.name, revenue: 0 };

          const { data: jeIds } = await supabase
            .from("journal_entry_lines")
            .select("journal_entry_id")
            .in("account_id", Array.from(owned))
            .limit(50000);
          const ids = Array.from(
            new Set((jeIds ?? []).map((r) => (r as { journal_entry_id: string }).journal_entry_id)),
          );
          if (ids.length === 0 || pendapatanIds.length === 0) {
            return { id: u.id, name: u.name, revenue: 0 };
          }

          let total = 0;
          for (let i = 0; i < ids.length; i += 800) {
            const batch = ids.slice(i, i + 800);
            const { data } = await supabase
              .from("journal_entry_lines")
              .select("debit, credit, journal_entries!inner(transaction_date)")
              .in("account_id", pendapatanIds)
              .in("journal_entry_id", batch)
              .gte("journal_entries.transaction_date", monthStart)
              .lte("journal_entries.transaction_date", todayStr)
              .limit(50000);
            for (const r of (data ?? []) as { debit: number | string; credit: number | string }[]) {
              const d = typeof r.debit === "number" ? r.debit : Number(r.debit) || 0;
              const c = typeof r.credit === "number" ? r.credit : Number(r.credit) || 0;
              total += c - d;
            }
          }
          return { id: u.id, name: u.name, revenue: total };
        }),
      );
      return results.sort((a, b) => b.revenue - a.revenue);
    },
  });

  return (
    <div className="glass-card rounded-2xl p-5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        Performa Unit Usaha
      </p>
      <h2 className="mt-1 text-lg font-semibold">Top Unit Bulan Ini</h2>

      {!unitRevenues || unitRevenues.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Belum ada unit usaha aktif.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {unitRevenues.slice(0, 5).map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between rounded-xl border border-border/60 bg-background/30 px-3 py-2.5 hover:border-[var(--neon-cyan)]/40 transition"
            >
              <div>
                <p className="text-sm font-medium">{u.name}</p>
                <p className="text-xs text-muted-foreground">{formatCompactRp(u.revenue)}</p>
              </div>
              <span className="text-xs font-semibold text-[var(--neon-green)]">Aktif</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
