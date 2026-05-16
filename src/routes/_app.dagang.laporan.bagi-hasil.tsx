import { createFileRoute } from "@tanstack/react-router";
import { BagiHasilPage } from "./_app.laporan.bagi-hasil";

export const Route = createFileRoute("/_app/dagang/laporan/bagi-hasil")({
  head: () => ({ meta: [{ title: "Bagi Hasil Dagang · BUMDes" }] }),
  component: () => (
    <BagiHasilPage
      fixedUnitCode="DAGANG"
      title="Bagi Hasil Unit Perdagangan"
      subtitle="Distribusi laba khusus Unit Perdagangan · mengacu pada Master Bagi Hasil Pusat."
    />
  ),
});
