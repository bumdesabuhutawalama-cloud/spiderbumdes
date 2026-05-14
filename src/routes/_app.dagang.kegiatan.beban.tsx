import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PengeluaranOperasionalForm } from "@/components/general-activities";

export const Route = createFileRoute("/_app/dagang/kegiatan/beban")({
  head: () => ({ meta: [{ title: "Beban Operasional Dagang · BUMDes" }] }),
  component: () => {
    const nav = useNavigate();
    return <PengeluaranOperasionalForm onClose={() => nav({ to: "/dagang/kegiatan" })} />;
  },
});
