import { createFileRoute } from "@tanstack/react-router";
import { BagiHasilPage } from "./_app.laporan.bagi-hasil";

export const Route = createFileRoute("/_app/usp/laporan/bagi-hasil")({
  head: () => ({ meta: [{ title: "Bagi Hasil USP · BUMDes" }] }),
  component: () => (
    <BagiHasilPage
      fixedUnitCode="USP"
      title="Bagi Hasil Unit Simpan Pinjam"
      subtitle="Distribusi laba khusus Unit Simpan Pinjam · mengacu pada Master Bagi Hasil Pusat."
    />
  ),
});
