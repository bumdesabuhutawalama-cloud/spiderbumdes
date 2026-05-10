import { createFileRoute } from "@tanstack/react-router";
import { ReportPage } from "@/components/ReportPage";

export const Route = createFileRoute("/_app/laporan/laba-rugi")({
  head: () => ({ meta: [{ title: "Laba Rugi · BUMDes" }] }),
  component: () => (
    <ReportPage
      title="Laporan Laba Rugi"
      subtitle="Performa pendapatan, beban, dan laba bersih konsolidasi."
      columns={["Kode", "Akun", "Periode Ini", "Periode Lalu"]}
      rows={[
        ["4-1100", "Pendapatan Unit Air", "Rp 124.300.000", "Rp 110.500.000"],
        ["4-1200", "Pendapatan Pasar Desa", "Rp 98.700.000", "Rp 92.900.000"],
        ["4-1300", "Pendapatan Simpan Pinjam", "Rp 76.200.000", "Rp 64.100.000"],
        ["5-1100", "Beban Operasional", "Rp 78.900.000", "Rp 72.300.000"],
        ["5-1200", "Beban Gaji", "Rp 64.500.000", "Rp 60.200.000"],
        ["9-9999", "Laba Bersih", "Rp 138.000.000", "Rp 121.700.000"],
      ]}
    />
  ),
});
