import { createFileRoute } from "@tanstack/react-router";
import { NeracaSheet } from "@/components/NeracaSheet";

export const Route = createFileRoute("/_app/laporan/neraca-konsolidasi")({
  head: () => ({ meta: [{ title: "Neraca Konsolidasi · BUMDes" }] }),
  component: () => (
    <NeracaSheet
      title="Laporan Posisi Keuangan Gabungan / Konsolidasian"
      subtitle="Konsolidasi BUM Desa · saldo dihitung otomatis dari jurnal."
      defaultMode="konsolidasi"
      lockMode
      heading={{
        line1: "Laporan Posisi Keuangan Gabungan / Konsolidasian",
        line3: "LAPORAN POSISI KEUANGAN (NERACA)",
      }}
    />
  ),
});
