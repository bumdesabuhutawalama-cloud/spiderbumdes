import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, ListChecks, ClipboardList, HandCoins, Banknote, AlertTriangle, Wallet, TrendingUp, Users } from "lucide-react";
import { PageHeader } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAccountBalances, useAccountBalancesPeriod, formatRp, type AccountLite } from "@/lib/account-balances";

export const Route = createFileRoute("/_app/usp")({
  head: () => ({ meta: [{ title: "Unit Simpan Pinjam · BUMDes" }] }),
  component: UspPage,
});

const USP_ACCOUNT_CODES = {
  kas: "1.1.01.06",
  bank: "1.1.01.07",
  piutang: "1.1.03.04",
  bunga: "4.1.08.02",
  denda: "4.1.08.03",
  beban: "6.1.10.01",
};

function UspPage() {
  return (
    <>
      <PageHeader
        title="Unit Simpan Pinjam"
        subtitle="Kelola pinjaman, angsuran, dan kinerja keuangan unit USP."
      />
      <UspSubNav active="dashboard" />
      <UspDashboard />
    </>
  );
}

export function UspSubNav({ active }: { active: "dashboard" | "pinjaman" }) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      <SubNav to="/usp" icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" active={active === "dashboard"} />
      <SubNav to="/usp/pinjaman" icon={<ListChecks className="h-4 w-4" />} label="Data Pinjaman" active={active === "pinjaman"} />
      <SubNav to="/catat-kegiatan" icon={<ClipboardList className="h-4 w-4" />} label="Catat Kegiatan" />
    </div>
  );
}

function SubNav({ to, icon, label, active }: { to: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
        active
          ? "border-[var(--neon-cyan)]/60 bg-[var(--neon-cyan)]/10 text-foreground"
          : "border-white/10 bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function UspDashboard() {
  const today = new Date();
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const todayStr = today.toISOString().slice(0, 10);

  const { data: accounts } = useQuery({
    queryKey: ["coa_accounts_usp_dash"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coa_accounts")
        .select("id, code, name, type, entry_type, normal_balance")
        .in("code", Object.values(USP_ACCOUNT_CODES))
        .limit(50);
      if (error) throw error;
      return data as AccountLite[];
    },
  });

  const { data: balAsOf } = useAccountBalances(todayStr);
  const { data: balMonth } = useAccountBalancesPeriod(monthStart, todayStr);

  const acc = (code: string) => accounts?.find((a) => a.code === code);
  const sumDebitMinusCredit = (id?: string) => {
    if (!id || !balAsOf) return 0;
    const r = balAsOf.get(id);
    return r ? r.debit - r.credit : 0;
  };
  const sumCreditMinusDebit = (id?: string, src = balAsOf) => {
    if (!id || !src) return 0;
    const r = src.get(id);
    return r ? r.credit - r.debit : 0;
  };

  const outstanding = sumDebitMinusCredit(acc(USP_ACCOUNT_CODES.piutang)?.id);
  const kasUsp = sumDebitMinusCredit(acc(USP_ACCOUNT_CODES.kas)?.id) + sumDebitMinusCredit(acc(USP_ACCOUNT_CODES.bank)?.id);
  const bungaBulan = sumCreditMinusDebit(acc(USP_ACCOUNT_CODES.bunga)?.id, balMonth);
  const dendaBulan = sumCreditMinusDebit(acc(USP_ACCOUNT_CODES.denda)?.id, balMonth);
  const bebanBulan = (() => {
    const a = acc(USP_ACCOUNT_CODES.beban);
    if (!a || !balMonth) return 0;
    const r = balMonth.get(a.id);
    return r ? r.debit - r.credit : 0;
  })();
  const labaBulan = bungaBulan + dendaBulan - bebanBulan;

  const { data: loanStats } = useQuery({
    queryKey: ["usp_loan_stats", todayStr],
    queryFn: async () => {
      const { data: loans } = await supabase
        .from("loans")
        .select("id, borrower_name, status, outstanding_principal");
      const active = (loans ?? []).filter((l) => l.status === "active");
      const borrowers = new Set(active.map((l) => l.borrower_name)).size;

      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
      const { data: dueThis } = await supabase
        .from("loan_installments")
        .select("id", { count: "exact", head: true })
        .eq("is_paid", false)
        .gte("due_date", monthStart)
        .lte("due_date", monthEnd);
      const { data: overdue } = await supabase
        .from("loan_installments")
        .select("id", { count: "exact", head: true })
        .eq("is_paid", false)
        .lt("due_date", todayStr);

      return {
        activeLoans: active.length,
        borrowers,
        dueThisMonth: (dueThis as unknown as { length: number })?.length ?? 0,
        overdue: (overdue as unknown as { length: number })?.length ?? 0,
      };
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["usp_recent_activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("id, transaction_date, transaction_type, description, total_amount")
        .like("transaction_type", "USP_%")
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat label="Outstanding Pinjaman" value={formatRp(outstanding)} icon={<HandCoins className="h-4 w-4" />} />
        <Stat label="Saldo Kas + Bank USP" value={formatRp(kasUsp)} icon={<Wallet className="h-4 w-4" />} />
        <Stat label="Pendapatan Bunga (Bln)" value={formatRp(bungaBulan)} icon={<TrendingUp className="h-4 w-4" />} />
        <Stat label="Pendapatan Denda (Bln)" value={formatRp(dendaBulan)} icon={<AlertTriangle className="h-4 w-4" />} />
        <Stat label="Laba Bersih (Bln)" value={formatRp(labaBulan)} icon={<Banknote className="h-4 w-4" />} highlight />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Pinjaman Aktif" value={String(loanStats?.activeLoans ?? 0)} icon={<ListChecks className="h-4 w-4" />} />
        <Stat label="Jumlah Peminjam" value={String(loanStats?.borrowers ?? 0)} icon={<Users className="h-4 w-4" />} />
        <Stat label="Jatuh Tempo Bulan Ini" value={String(loanStats?.dueThisMonth ?? 0)} icon={<ClipboardList className="h-4 w-4" />} />
        <Stat label="Tertunggak (Overdue)" value={String(loanStats?.overdue ?? 0)} icon={<AlertTriangle className="h-4 w-4" />} />
      </div>

      <div className="glass-card rounded-2xl p-4 sm:p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-[var(--neon-cyan)]" />
          Aktivitas USP Terbaru
        </h3>
        {!recent || recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada aktivitas USP.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase text-muted-foreground">
                <tr><th className="text-left py-2">Tanggal</th><th className="text-left">Tipe</th><th className="text-left">Keterangan</th><th className="text-right">Nilai</th></tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-t border-white/5">
                    <td className="py-2">{r.transaction_date}</td>
                    <td>{labelType(r.transaction_type)}</td>
                    <td className="text-muted-foreground">{r.description ?? "—"}</td>
                    <td className="text-right font-mono">{formatRp(Number(r.total_amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function labelType(t: string) {
  switch (t) {
    case "USP_PENCAIRAN": return "Pencairan Pinjaman";
    case "USP_ANGSURAN": return "Terima Angsuran";
    case "USP_DENDA": return "Terima Denda";
    case "USP_BEBAN": return "Beban Operasional";
    default: return t;
  }
}

function Stat({ label, value, icon, highlight }: { label: string; value: string; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`glass-card rounded-2xl p-4 ${highlight ? "border-[var(--neon-cyan)]/40" : ""}`}>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}{label}
      </div>
      <div className={`mt-1.5 text-lg font-semibold tabular-nums ${highlight ? "text-[var(--neon-cyan)] text-glow-cyan" : ""}`}>{value}</div>
    </div>
  );
}
