import { createFileRoute } from "@tanstack/react-router";
import { BukuBesarSheet } from "@/components/BukuBesarSheet";

export const Route = createFileRoute("/_app/laporan/buku-besar-pusat")({
  head: () => ({ meta: [{ title: "Buku Besar Pusat · BUMDes" }] }),
  component: () => (
    <BukuBesarSheet
      title="Buku Besar Pusat"
      subtitle="Mutasi akun khusus entity Pusat · saldo berjalan dihitung otomatis dari jurnal."
      mode="pusat"
    />
  ),
});
