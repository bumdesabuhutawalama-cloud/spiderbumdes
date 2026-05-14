import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PenerimaanPiutangForm } from "@/components/dagang-activities";

export const Route = createFileRoute("/_app/dagang/kegiatan/penerimaan-piutang")({
  head: () => ({ meta: [{ title: "Penerimaan Piutang · BUMDes" }] }),
  component: () => {
    const nav = useNavigate();
    return <PenerimaanPiutangForm onClose={() => nav({ to: "/dagang/kegiatan" })} />;
  },
});
