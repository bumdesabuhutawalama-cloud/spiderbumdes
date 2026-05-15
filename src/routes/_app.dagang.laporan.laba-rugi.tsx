import { createFileRoute } from "@tanstack/react-router";
import { LabaRugiPage } from "./_app.laporan.laba-rugi";

export const Route = createFileRoute("/_app/dagang/laporan/laba-rugi")({
  head: () => ({ meta: [{ title: "Laba Rugi Dagang · BUMDes" }] }),
  component: () => (
    <LabaRugiPage
      title="Laba Rugi Unit Perdagangan"
      subtitle="Pendapatan, HPP, dan beban khusus aktivitas Dagang · dihitung otomatis dari jurnal."
      fixedUnitCode="DAGANG"
      heading={{
        line1: "Laporan Laba Rugi Unit Usaha BUM Desa",
        line2: "UNIT PERDAGANGAN",
        line3: "LAPORAN LABA RUGI",
      }}
    />
  ),
});
