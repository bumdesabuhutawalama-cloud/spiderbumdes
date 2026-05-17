import { createFileRoute } from "@tanstack/react-router";
import { FixedAssetsPage } from "@/components/FixedAssetsPage";

export const Route = createFileRoute("/_app/usp/aset")({
  head: () => ({ meta: [{ title: "Aset Tetap USP · BUMDes" }] }),
  component: () => (
    <FixedAssetsPage
      title="Aset Tetap Unit Simpan Pinjam"
      subtitle="Daftar aset tetap milik Unit USP · dibuat otomatis dari jurnal pembelian aset."
      fixedUnitCode="USP"
    />
  ),
});
