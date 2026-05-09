import { createFileRoute } from "@tanstack/react-router";
import { ReportPage } from "@/components/ReportPage";

export const Route = createFileRoute("/laporan/neraca-konsolidasi")({
  head: () => ({ meta: [{ title: "Neraca Konsolidasi · BUMDes" }] }),
  component: () => (
    <ReportPage
      title="Neraca Konsolidasi"
      subtitle="Gabungan posisi keuangan pusat dan seluruh unit usaha."
      columns={["Kode", "Akun", "Pusat", "Unit", "Konsolidasi"]}
      rows={[
        ["1-1000", "Total Aset Lancar", "Rp 1.512.000.000", "Rp 384.200.000", "Rp 1.896.200.000"],
        ["1-2000", "Total Aset Tetap", "Rp 2.450.000.000", "Rp 478.000.000", "Rp 2.928.000.000"],
        ["2-1000", "Total Liabilitas", "Rp 134.800.000", "Rp 64.500.000", "Rp 199.300.000"],
        ["3-1000", "Modal & Ekuitas", "Rp 3.742.000.000", "Rp 882.900.000", "Rp 4.624.900.000"],
      ]}
    />
  ),
});
