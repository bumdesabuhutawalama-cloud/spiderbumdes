import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BelanjaAsetForm } from "@/components/general-activities";

export const Route = createFileRoute("/_app/usp/kegiatan/belanja-aset")({
  head: () => ({ meta: [{ title: "Belanja Aset / Modal · BUMDes" }] }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  return <BelanjaAsetForm onClose={() => navigate({ to: "/usp/kegiatan" })} />;
}
