import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wallet, Package, TrendingUp, Receipt, ClipboardList, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  useAccountBalances,
  useAccountBalancesPeriod,
  formatRp,
  type AccountLite,
} from "@/lib/account-balances";

export const Route = createFileRoute("/_app/dagang/")({
  head: () => ({ meta: [{ title: "Dashboard Perdagangan · BUMDes" }] }),
  component: Page,
});

const CODES = {
  kas: "1.1.01.99",
  persediaan: "1.1.05.01",
  piutang: "1.1.03.01",
  utang: "2.1.01.01",
  pendapatan: "4.2.01.00",
  hpp: "5.1.01.00",
};

function Page() {
  const today = new Date();
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const todayStr = today.toISOString().slice(0, 10);

  const { data: accounts } = useQuery({
    queryKey: ["coa_dagang_dash"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coa_accounts")
        .select("id, code, name, type, entry_type, normal_balance")
        .in("code", Object.values(CODES));
      if (error) throw error;
      return data as AccountLite[];
    },
  });

  const { data: balAsOf } = useAccountBalances(todayStr);
  const { data: balMonth } = useAccountBalancesPeriod(monthStart, todayStr);

  const acc = (c: string) => accounts?.find((a) => a.code === c);
  const dr = (id?: string, src = balAsOf) => {
    if (!id || !src) return 0;
    const r = src.get(id);
    return r ? r.debit - r.credit : 0;
  };
  const cr = (id?: string, src = balAsOf) => {
    if (!id || !src) return 0;
    const r = src.get(id);
    return r ? r.credit - r.debit : 0;
  };

  const kas = dr(acc(CODES.kas)?.id);
  const persediaan = dr(acc(CODES.persediaan)?.id);
  const piutang = dr(acc(CODES.piutang)?.id);
  const utang = cr(acc(CODES.utang)?.id);
  const pendapatanBln = cr(acc(CODES.pendapatan)?.id, balMonth);
  const hppBln = dr(acc(CODES.hpp)?.id, balMonth);
  const labaBln = pendapatanBln - hppBln;

  const { data: prodStats } = useQuery({
    queryKey: ["dagang_product_stats"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, stock_qty, min_stock");
      const list = data ?? [];
      return {
        total: list.length,
        lowStock: list.filter((p) => Number(p.stock_qty) <= Number(p.min_stock || 0)).length,
      };
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["dagang_recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("journal_entries")
        .select("id, transaction_date, transaction_type, description, total_amount")
        .like("transaction_type", "DAGANG_%")
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  return (
    <>
      <PageHeader
        title="Dashboard Perdagangan"
        subtitle="Ringkasan kinerja Unit Perdagangan — kas, persediaan, dan laba berjalan."
      />
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Saldo Kas Dagang" value={formatRp(kas)} icon={<Wallet className="h-4 w-4" />} />
          <Stat label="Nilai Persediaan" value={formatRp(persediaan)} icon={<Package className="h-4 w-4" />} />
          <Stat label="Piutang Usaha" value={formatRp(piutang)} icon={<Receipt className="h-4 w-4" />} />
          <Stat label="Utang Usaha" value={formatRp(utang)} icon={<Receipt className="h-4 w-4" />} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Penjualan (Bln)" value={formatRp(pendapatanBln)} icon={<ShoppingCart className="h-4 w-4" />} />
          <Stat label="HPP (Bln)" value={formatRp(hppBln)} icon={<TrendingUp className="h-4 w-4" />} />
          <Stat label="Laba Kotor (Bln)" value={formatRp(labaBln)} icon={<TrendingUp className="h-4 w-4" />} highlight />
          <Stat label="Produk / Stok Menipis" value={`${prodStats?.total ?? 0} / ${prodStats?.lowStock ?? 0}`} icon={<Package className="h-4 w-4" />} />
        </div>

        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-[var(--neon-cyan)]" />
            Aktivitas Perdagangan Terbaru
          </h3>
          {!recent || recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada aktivitas. <Link to="/dagang/kegiatan" className="text-[var(--neon-cyan)] hover:underline">Catat kegiatan</Link>.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left py-2">Tanggal</th>
                    <th className="text-left">Tipe</th>
                    <th className="text-left">Keterangan</th>
                    <th className="text-right">Nilai</th>
                  </tr>
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
    </>
  );
}

function labelType(t: string) {
  const map: Record<string, string> = {
    DAGANG_PEMBELIAN_TUNAI: "Pembelian Tunai",
    DAGANG_PEMBELIAN_KREDIT: "Pembelian Kredit",
    DAGANG_PENJUALAN_TUNAI: "Penjualan Tunai",
    DAGANG_PENJUALAN_KREDIT: "Penjualan Kredit",
    DAGANG_TERIMA_PIUTANG: "Penerimaan Piutang",
    DAGANG_BAYAR_UTANG: "Pembayaran Utang",
  };
  return map[t] ?? t;
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
