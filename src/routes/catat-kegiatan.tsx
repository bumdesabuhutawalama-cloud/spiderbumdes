import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Plus } from "lucide-react";
import { DashboardLayout, PageHeader } from "@/components/DashboardLayout";

export const Route = createFileRoute("/catat-kegiatan")({
  head: () => ({ meta: [{ title: "Catat Kegiatan · BUMDes" }] }),
  component: CatatKegiatanPage,
});

function CatatKegiatanPage() {
  return (
    <DashboardLayout>
      <PageHeader
        title="Catat Kegiatan"
        subtitle="Pencatatan aktivitas operasional dan transaksi harian BUM Desa."
        actions={
          <button className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] px-4 py-2 text-sm font-medium text-[oklch(0.15_0.03_250)] glow-cyan hover:opacity-90 transition">
            <Plus className="h-4 w-4" />
            Tambah Kegiatan
          </button>
        }
      />

      <div className="glass-card rounded-2xl p-10 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary/60 text-[var(--neon-cyan)]">
          <ClipboardList className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Belum ada kegiatan tercatat</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Mulai catat kegiatan operasional, transaksi, dan aktivitas unit usaha di sini.
        </p>
      </div>
    </DashboardLayout>
  );
}
