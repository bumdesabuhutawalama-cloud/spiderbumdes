import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PembelianKreditForm } from "@/components/dagang-activities";

export const Route = createFileRoute("/_app/dagang/kegiatan/pembelian-kredit")({
  head: () => ({ meta: [{ title: "Pembelian Kredit · BUMDes" }] }),
  component: () => {
    const nav = useNavigate();
    return <PembelianKreditForm onClose={() => nav({ to: "/dagang/kegiatan" })} />;
  },
});
