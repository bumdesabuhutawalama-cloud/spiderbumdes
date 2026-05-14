import { createFileRoute } from "@tanstack/react-router";
import { NeracaSheet } from "@/components/NeracaSheet";

export const Route = createFileRoute("/_app/dagang/laporan/neraca")({
  head: () => ({ meta: [{ title: "Neraca Dagang · BUMDes" }] }),
  component: () => (
    <NeracaSheet
      title="Neraca Unit Perdagangan"
      subtitle="Posisi keuangan khusus aktivitas Dagang · saldo dihitung otomatis dari jurnal."
      fixedUnitCode="DAGANG"
      heading={{
        line1: "Laporan Posisi Keuangan Unit Usaha BUM Desa",
        line2: "UNIT PERDAGANGAN",
        line3: "LAPORAN POSISI KEUANGAN (NERACA)",
      }}
    />
  ),
});
