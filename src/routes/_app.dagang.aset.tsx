import { createFileRoute } from "@tanstack/react-router";
import { FixedAssetsPage } from "@/components/FixedAssetsPage";

export const Route = createFileRoute("/_app/dagang/aset")({
  head: () => ({ meta: [{ title: "Aset Tetap Dagang · BUMDes" }] }),
  component: () => (
    <FixedAssetsPage
      title="Aset Tetap Unit Perdagangan"
      subtitle="Daftar aset tetap milik Unit Dagang · dibuat otomatis dari jurnal pembelian aset."
      fixedUnitCode="DAGANG"
    />
  ),
});
