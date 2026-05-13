import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PenyertaanModalForm } from "@/components/general-activities";

export const Route = createFileRoute("/_app/usp/kegiatan/penyertaan-modal")({
  head: () => ({ meta: [{ title: "Penyertaan Modal · BUMDes" }] }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  return <PenyertaanModalForm onClose={() => navigate({ to: "/usp/kegiatan" })} />;
}
