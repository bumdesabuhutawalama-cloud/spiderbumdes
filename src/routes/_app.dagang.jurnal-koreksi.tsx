import { createFileRoute } from "@tanstack/react-router";
import { JurnalKoreksiPage } from "./_app.jurnal-koreksi";

export const Route = createFileRoute("/_app/dagang/jurnal-koreksi")({
  head: () => ({ meta: [{ title: "Jurnal Koreksi Dagang · BUMDes" }] }),
  component: () => (
    <JurnalKoreksiPage
      prefix="DAGANG_"
      title="Jurnal Koreksi Perdagangan"
      subtitle="Koreksi jurnal khusus Unit Perdagangan. Hanya menampilkan transaksi unit ini."
    />
  ),
});
