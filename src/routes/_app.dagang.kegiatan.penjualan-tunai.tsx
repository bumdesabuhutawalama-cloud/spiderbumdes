import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PenjualanTunaiForm } from "@/components/dagang-activities";

export const Route = createFileRoute("/_app/dagang/kegiatan/penjualan-tunai")({
  head: () => ({ meta: [{ title: "Penjualan Tunai · BUMDes" }] }),
  component: () => {
    const nav = useNavigate();
    return <PenjualanTunaiForm onClose={() => nav({ to: "/dagang/kegiatan" })} />;
  },
});
