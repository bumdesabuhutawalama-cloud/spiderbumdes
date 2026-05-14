import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PembelianTunaiForm } from "@/components/dagang-activities";

export const Route = createFileRoute("/_app/dagang/kegiatan/pembelian-tunai")({
  head: () => ({ meta: [{ title: "Pembelian Tunai · BUMDes" }] }),
  component: () => {
    const nav = useNavigate();
    return <PembelianTunaiForm onClose={() => nav({ to: "/dagang/kegiatan" })} />;
  },
});
