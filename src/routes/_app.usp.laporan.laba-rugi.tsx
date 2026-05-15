import { createFileRoute } from "@tanstack/react-router";
import { LabaRugiPage } from "./_app.laporan.laba-rugi";

export const Route = createFileRoute("/_app/usp/laporan/laba-rugi")({
  head: () => ({ meta: [{ title: "Laba Rugi USP · BUMDes" }] }),
  component: () => (
    <LabaRugiPage
      title="Laba Rugi Unit Simpan Pinjam"
      subtitle="Pendapatan dan beban khusus aktivitas USP · dihitung otomatis dari jurnal."
      fixedUnitCode="USP"
      heading={{
        line1: "Laporan Laba Rugi Unit Usaha BUM Desa",
        line2: "UNIT SIMPAN PINJAM",
        line3: "LAPORAN LABA RUGI",
      }}
    />
  ),
});
