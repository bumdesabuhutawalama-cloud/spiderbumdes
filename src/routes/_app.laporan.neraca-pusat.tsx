import { createFileRoute } from "@tanstack/react-router";
import { NeracaSheet } from "@/components/NeracaSheet";

export const Route = createFileRoute("/_app/laporan/neraca-pusat")({
  head: () => ({ meta: [{ title: "Neraca Pusat · BUMDes" }] }),
  component: () => (
    <NeracaSheet
      title="Laporan Posisi Keuangan (Neraca Pusat)"
      subtitle="Format Kantor Pusat BUM Desa · saldo dihitung otomatis dari jurnal."
      heading={{
        line1: "Laporan Posisi Keuangan Kantor Pusat BUM Desa",
        line2: "KANTOR PUSAT",
        line3: "LAPORAN POSISI KEUANGAN (NERACA)",
      }}
    />
  ),
});
