import { createFileRoute, Link } from "@tanstack/react-router";
import {
  PackagePlus,
  ShoppingCart,
  HandCoins,
  CreditCard,
  Receipt,
  Package,
  Wallet,
  ClipboardList,
} from "lucide-react";
import { PageHeader } from "@/components/DashboardLayout";

export const Route = createFileRoute("/_app/dagang/kegiatan/")({
  head: () => ({ meta: [{ title: "Catat Kegiatan Dagang · BUMDes" }] }),
  component: Page,
});

type CardItem = {
  to:
    | "/dagang/kegiatan/pembelian-tunai"
    | "/dagang/kegiatan/pembelian-kredit"
    | "/dagang/kegiatan/penjualan-tunai"
    | "/dagang/kegiatan/penjualan-kredit"
    | "/dagang/kegiatan/penerimaan-piutang"
    | "/dagang/kegiatan/pembayaran-utang"
    | "/dagang/kegiatan/beban"
    | "/dagang/kegiatan/penerimaan-kas"
    | "/dagang/kegiatan/belanja-aset"
    | "/dagang/kegiatan/pengeluaran";
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
};

const items: CardItem[] = [
  { to: "/dagang/kegiatan/pembelian-tunai", icon: <PackagePlus className="h-6 w-6" />, title: "Pembelian Tunai", description: "Pembelian barang dagangan dibayar tunai. Stok & HPP rata-rata otomatis.", accent: "from-[var(--neon-green)] to-amber-300" },
  { to: "/dagang/kegiatan/pembelian-kredit", icon: <PackagePlus className="h-6 w-6" />, title: "Pembelian Kredit", description: "Pembelian dengan utang ke supplier. Persediaan ↑ Utang ↑.", accent: "from-amber-400 to-rose-400" },
  { to: "/dagang/kegiatan/penjualan-tunai", icon: <ShoppingCart className="h-6 w-6" />, title: "Penjualan Tunai", description: "Penjualan dibayar tunai. Pendapatan + HPP otomatis.", accent: "from-[var(--neon-cyan)] to-sky-400" },
  { to: "/dagang/kegiatan/penjualan-kredit", icon: <ShoppingCart className="h-6 w-6" />, title: "Penjualan Kredit", description: "Penjualan dengan piutang ke pembeli. HPP otomatis.", accent: "from-fuchsia-400 to-[var(--neon-cyan)]" },
  { to: "/dagang/kegiatan/penerimaan-piutang", icon: <HandCoins className="h-6 w-6" />, title: "Penerimaan Piutang", description: "Pelunasan piutang dari pembeli.", accent: "from-emerald-400 to-[var(--neon-cyan)]" },
  { to: "/dagang/kegiatan/pembayaran-utang", icon: <CreditCard className="h-6 w-6" />, title: "Pembayaran Utang", description: "Pelunasan utang ke supplier.", accent: "from-rose-400 to-amber-300" },
  { to: "/dagang/kegiatan/beban", icon: <Receipt className="h-6 w-6" />, title: "Beban Operasional", description: "Beban operasional unit perdagangan.", accent: "from-violet-400 to-fuchsia-400" },
  { to: "/dagang/kegiatan/penerimaan-kas", icon: <Wallet className="h-6 w-6" />, title: "Penerimaan Kas Lain", description: "Pemasukan kas lain selain penjualan.", accent: "from-fuchsia-400 to-[var(--neon-cyan)]" },
  { to: "/dagang/kegiatan/belanja-aset", icon: <Package className="h-6 w-6" />, title: "Belanja Aset / Modal", description: "Pembelian aset tetap untuk unit dagang.", accent: "from-[var(--neon-green)] to-amber-300" },
  { to: "/dagang/kegiatan/pengeluaran", icon: <ClipboardList className="h-6 w-6" />, title: "Pengeluaran Lain", description: "Pengeluaran operasional harian.", accent: "from-amber-400 to-rose-400" },
];

function Page() {
  return (
    <>
      <PageHeader title="Catat Kegiatan Perdagangan" subtitle="Pilih jenis aktivitas. Jurnal dibuat otomatis." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it) => (
          <Link
            key={it.to}
            to={it.to}
            preload="intent"
            className="glass-card group relative rounded-2xl p-5 text-left transition hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(34,211,238,0.15)]"
          >
            <div className={`mb-3 inline-grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${it.accent} text-[oklch(0.15_0.03_250)]`}>
              {it.icon}
            </div>
            <h3 className="text-base font-semibold">{it.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{it.description}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
