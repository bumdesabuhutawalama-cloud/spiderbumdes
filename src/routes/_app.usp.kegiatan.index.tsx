import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClipboardList,
  TrendingUp,
  Wallet,
  Package,
  HandCoins,
  Banknote,
  AlertTriangle,
  Receipt,
} from "lucide-react";
import { PageHeader } from "@/components/DashboardLayout";

export const Route = createFileRoute("/_app/usp/kegiatan/")({
  head: () => ({ meta: [{ title: "Catat Kegiatan · BUMDes" }] }),
  component: CatatKegiatanIndex,
});

type CardItem = {
  to:
    | "/usp/kegiatan/penyertaan-modal"
    | "/usp/kegiatan/belanja-aset"
    | "/usp/kegiatan/penerimaan-kas"
    | "/usp/kegiatan/pengeluaran"
    | "/usp/kegiatan/pencairan"
    | "/usp/kegiatan/angsuran"
    | "/usp/kegiatan/denda"
    | "/usp/kegiatan/beban";
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
};

const items: CardItem[] = [
  { to: "/usp/kegiatan/penyertaan-modal", icon: <TrendingUp className="h-6 w-6" />, title: "Penyertaan Modal", description: "Pencatatan penambahan modal dari Desa atau Investor.", accent: "from-[var(--neon-cyan)] to-[var(--neon-green)]" },
  { to: "/usp/kegiatan/belanja-aset", icon: <Package className="h-6 w-6" />, title: "Belanja Aset / Modal", description: "Pembelian aset tetap atau belanja modal unit usaha.", accent: "from-[var(--neon-green)] to-amber-300" },
  { to: "/usp/kegiatan/penerimaan-kas", icon: <Wallet className="h-6 w-6" />, title: "Penerimaan Kas", description: "Catat pemasukan kas dari operasional unit usaha.", accent: "from-fuchsia-400 to-[var(--neon-cyan)]" },
  { to: "/usp/kegiatan/pengeluaran", icon: <ClipboardList className="h-6 w-6" />, title: "Pengeluaran Operasional", description: "Catat pengeluaran operasional harian unit usaha.", accent: "from-amber-400 to-rose-400" },
  { to: "/usp/kegiatan/pencairan", icon: <HandCoins className="h-6 w-6" />, title: "Pencairan Pinjaman (USP)", description: "Cairkan pinjaman ke peminjam, jadwal angsuran otomatis.", accent: "from-emerald-400 to-[var(--neon-cyan)]" },
  { to: "/usp/kegiatan/angsuran", icon: <Banknote className="h-6 w-6" />, title: "Terima Angsuran (USP)", description: "Catat penerimaan angsuran pokok & bunga pinjaman.", accent: "from-[var(--neon-cyan)] to-sky-400" },
  { to: "/usp/kegiatan/denda", icon: <AlertTriangle className="h-6 w-6" />, title: "Terima Denda (USP)", description: "Catat penerimaan denda keterlambatan angsuran.", accent: "from-rose-400 to-amber-300" },
  { to: "/usp/kegiatan/beban", icon: <Receipt className="h-6 w-6" />, title: "Beban Operasional (USP)", description: "Catat beban operasional Unit Simpan Pinjam.", accent: "from-violet-400 to-fuchsia-400" },
];

function CatatKegiatanIndex() {
  return (
    <>
      <PageHeader
        title="Catat Kegiatan"
        subtitle="Pilih jenis aktivitas untuk membuka halaman pencatatan."
      />
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
