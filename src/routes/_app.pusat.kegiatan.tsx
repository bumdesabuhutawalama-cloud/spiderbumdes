import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ClipboardList, TrendingUp, Wallet, Package, ArrowLeftRight } from "lucide-react";
import { PageHeader } from "@/components/DashboardLayout";
import {
  PenyertaanModalDialog,
  BelanjaAsetDialog,
  PenerimaanKasDialog,
  PengeluaranOperasionalDialog,
} from "@/routes/_app.usp.kegiatan";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/pusat/kegiatan")({
  head: () => ({ meta: [{ title: "Catat Kegiatan Pusat · BUMDes" }] }),
  component: CatatKegiatanPusatPage,
});

function CatatKegiatanPusatPage() {
  const [openPenyertaan, setOpenPenyertaan] = useState(false);
  const [openBelanjaAset, setOpenBelanjaAset] = useState(false);
  const [openPenerimaan, setOpenPenerimaan] = useState(false);
  const [openPengeluaran, setOpenPengeluaran] = useState(false);

  return (
    <>
      <PageHeader
        title="Catat Kegiatan Pusat"
        subtitle="Pencatatan transaksi operasional Unit Pusat. Pilih akun kas/bank milik Pusat agar transaksi tidak tercampur dengan unit usaha."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ActivityCard
          icon={<TrendingUp className="h-6 w-6" />}
          title="Penyertaan Modal"
          description="Pencatatan penambahan modal dari Desa atau Investor untuk Pusat."
          onClick={() => setOpenPenyertaan(true)}
          accent="from-[var(--neon-cyan)] to-[var(--neon-green)]"
        />
        <ActivityCard
          icon={<Package className="h-6 w-6" />}
          title="Belanja Aset / Modal"
          description="Pembelian aset tetap atau belanja modal Unit Pusat."
          onClick={() => setOpenBelanjaAset(true)}
          accent="from-[var(--neon-green)] to-amber-300"
        />
        <ActivityCard
          icon={<Wallet className="h-6 w-6" />}
          title="Penerimaan Kas Pusat"
          description="Catat pemasukan kas operasional Pusat (sewa, jasa, dsb)."
          onClick={() => setOpenPenerimaan(true)}
          accent="from-fuchsia-400 to-[var(--neon-cyan)]"
        />
        <ActivityCard
          icon={<ClipboardList className="h-6 w-6" />}
          title="Pengeluaran Operasional"
          description="Catat biaya administrasi & operasional Pusat."
          onClick={() => setOpenPengeluaran(true)}
          accent="from-amber-400 to-rose-400"
        />
        <Link
          to="/usp/transfer"
          className="glass-card group relative rounded-2xl p-5 text-left transition hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(34,211,238,0.15)]"
        >
          <div className="mb-3 inline-grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-violet-400 text-[oklch(0.15_0.03_250)]">
            <ArrowLeftRight className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold">Transfer Antar Entitas</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Transfer dana / penyertaan ke unit usaha (USP, Dagang, dsb) via mekanisme RK.
          </p>
        </Link>
      </div>

      <div className="mt-6 rounded-xl border border-[var(--neon-cyan)]/20 bg-[var(--neon-cyan)]/5 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Catatan penting</p>
        <p>
          Transaksi yang dicatat di sini hanya mempengaruhi akun milik Pusat. Untuk memindahkan dana
          atau modal ke unit usaha, gunakan menu <strong>Transfer Antar Entitas</strong> agar
          tercatat sebagai RK antar unit dan tidak mencampur jurnal unit lain.
        </p>
      </div>

      {openPenyertaan && <PenyertaanModalDialog onClose={() => setOpenPenyertaan(false)} />}
      {openBelanjaAset && <BelanjaAsetDialog onClose={() => setOpenBelanjaAset(false)} />}
      {openPenerimaan && <PenerimaanKasDialog onClose={() => setOpenPenerimaan(false)} />}
      {openPengeluaran && <PengeluaranOperasionalDialog onClose={() => setOpenPengeluaran(false)} />}
    </>
  );
}

function ActivityCard({
  icon,
  title,
  description,
  onClick,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  accent: string;
}) {
  return (
    <button
      onClick={onClick}
      className="glass-card group relative rounded-2xl p-5 text-left transition hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(34,211,238,0.15)]"
    >
      <div className={`mb-3 inline-grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${accent} text-[oklch(0.15_0.03_250)]`}>
        {icon}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </button>
  );
}
