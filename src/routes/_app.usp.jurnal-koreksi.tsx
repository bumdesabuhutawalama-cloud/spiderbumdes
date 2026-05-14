import { createFileRoute } from "@tanstack/react-router";
import { JurnalKoreksiPage } from "./_app.jurnal-koreksi";

export const Route = createFileRoute("/_app/usp/jurnal-koreksi")({
  head: () => ({ meta: [{ title: "Jurnal Koreksi USP · BUMDes" }] }),
  component: () => (
    <JurnalKoreksiPage
      prefix="USP_"
      title="Jurnal Koreksi Simpan Pinjam"
      subtitle="Koreksi jurnal khusus Unit Simpan Pinjam. Hanya menampilkan transaksi unit ini."
    />
  ),
});
