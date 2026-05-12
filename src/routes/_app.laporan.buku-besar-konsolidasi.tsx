import { createFileRoute } from "@tanstack/react-router";
import { BukuBesarSheet } from "@/components/BukuBesarSheet";

export const Route = createFileRoute("/_app/laporan/buku-besar-konsolidasi")({
  head: () => ({ meta: [{ title: "Buku Besar Konsolidasi · BUMDes" }] }),
  component: () => (
    <BukuBesarSheet
      title="Buku Besar Konsolidasi"
      subtitle="Mutasi akun seluruh entity (Pusat & Unit Usaha) dengan filter entity."
      mode="konsolidasi"
    />
  ),
});
