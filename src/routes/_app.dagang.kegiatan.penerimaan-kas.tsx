import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PenerimaanKasForm } from "@/components/general-activities";

export const Route = createFileRoute("/_app/dagang/kegiatan/penerimaan-kas")({
  head: () => ({ meta: [{ title: "Penerimaan Kas · BUMDes" }] }),
  component: () => {
    const nav = useNavigate();
    return <PenerimaanKasForm onClose={() => nav({ to: "/dagang/kegiatan" })} />;
  },
});
