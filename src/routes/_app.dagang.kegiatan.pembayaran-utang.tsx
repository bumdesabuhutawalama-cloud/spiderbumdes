import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PembayaranUtangForm } from "@/components/dagang-activities";

export const Route = createFileRoute("/_app/dagang/kegiatan/pembayaran-utang")({
  head: () => ({ meta: [{ title: "Pembayaran Utang · BUMDes" }] }),
  component: () => {
    const nav = useNavigate();
    return <PembayaranUtangForm onClose={() => nav({ to: "/dagang/kegiatan" })} />;
  },
});
