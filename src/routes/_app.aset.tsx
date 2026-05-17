import { createFileRoute } from "@tanstack/react-router";
import { FixedAssetsPage } from "@/components/FixedAssetsPage";

export const Route = createFileRoute("/_app/aset")({
  head: () => ({ meta: [{ title: "Aset Tetap · BUMDes" }] }),
  component: () => (
    <FixedAssetsPage
      title="Aset Tetap (Konsolidasi)"
      subtitle="Daftar aset tetap seluruh unit · dibuat otomatis dari jurnal pembelian aset."
    />
  ),
});
