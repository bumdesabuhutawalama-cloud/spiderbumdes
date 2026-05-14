import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BelanjaAsetForm } from "@/components/general-activities";

export const Route = createFileRoute("/_app/dagang/kegiatan/belanja-aset")({
  head: () => ({ meta: [{ title: "Belanja Aset · BUMDes" }] }),
  component: () => {
    const nav = useNavigate();
    return <BelanjaAsetForm onClose={() => nav({ to: "/dagang/kegiatan" })} />;
  },
});
