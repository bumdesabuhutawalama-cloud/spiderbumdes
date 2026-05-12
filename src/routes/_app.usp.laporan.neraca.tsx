import { createFileRoute } from "@tanstack/react-router";
import { NeracaSheet } from "@/components/NeracaSheet";

export const Route = createFileRoute("/_app/usp/laporan/neraca")({
  head: () => ({ meta: [{ title: "Neraca USP · BUMDes" }] }),
  component: () => (
    <NeracaSheet
      title="Neraca Unit Simpan Pinjam"
      subtitle="Posisi keuangan khusus aktivitas USP · saldo dihitung otomatis dari jurnal."
      fixedUnitCode="USP"
      heading={{
        line1: "Laporan Posisi Keuangan Unit Usaha BUM Desa",
        line2: "UNIT SIMPAN PINJAM",
        line3: "LAPORAN POSISI KEUANGAN (NERACA)",
      }}
    />
  ),
});
