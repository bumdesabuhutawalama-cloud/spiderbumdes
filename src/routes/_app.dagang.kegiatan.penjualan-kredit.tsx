import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PenjualanKreditForm } from "@/components/dagang-activities";

export const Route = createFileRoute("/_app/dagang/kegiatan/penjualan-kredit")({
  head: () => ({ meta: [{ title: "Penjualan Kredit · BUMDes" }] }),
  component: () => {
    const nav = useNavigate();
    return <PenjualanKreditForm onClose={() => nav({ to: "/dagang/kegiatan" })} />;
  },
});
