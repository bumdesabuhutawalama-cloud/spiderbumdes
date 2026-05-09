import { createFileRoute } from "@tanstack/react-router";
import { ReportPage } from "@/components/ReportPage";

export const Route = createFileRoute("/laporan/neraca-pusat")({
  head: () => ({ meta: [{ title: "Neraca Pusat · BUMDes" }] }),
  component: () => (
    <ReportPage
      title="Neraca Pusat"
      subtitle="Posisi keuangan kantor pusat BUMDes per periode."
      columns={["Kode", "Akun", "Debit", "Kredit"]}
      rows={[
        ["1-1100", "Kas", "Rp 142.500.000", "—"],
        ["1-1200", "Bank BRI", "Rp 1.284.300.000", "—"],
        ["1-2100", "Tanah & Bangunan", "Rp 2.450.000.000", "—"],
        ["2-1100", "Hutang Usaha", "—", "Rp 134.800.000"],
        ["3-1000", "Modal Disetor Desa", "—", "Rp 3.000.000.000"],
        ["3-2000", "Laba Ditahan", "—", "Rp 742.000.000"],
      ]}
    />
  ),
});
