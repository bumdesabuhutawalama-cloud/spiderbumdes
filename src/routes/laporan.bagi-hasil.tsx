import { createFileRoute } from "@tanstack/react-router";
import { ReportPage } from "@/components/ReportPage";

export const Route = createFileRoute("/laporan/bagi-hasil")({
  head: () => ({ meta: [{ title: "Bagi Hasil · BUMDes" }] }),
  component: () => (
    <ReportPage
      title="Laporan Bagi Hasil"
      subtitle="Distribusi laba ke desa, cadangan, dan pengembangan unit."
      columns={["Kode", "Penerima", "Persentase", "Nominal"]}
      rows={[
        ["BH-01", "Pendapatan Asli Desa (PADes)", "40%", "Rp 55.200.000"],
        ["BH-02", "Cadangan Modal", "25%", "Rp 34.500.000"],
        ["BH-03", "Pengembangan Unit Usaha", "20%", "Rp 27.600.000"],
        ["BH-04", "Insentif Pengurus", "10%", "Rp 13.800.000"],
        ["BH-05", "Dana Sosial Desa", "5%", "Rp 6.900.000"],
      ]}
    />
  ),
});
