import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PenerimaanKasForm } from "@/components/general-activities";

export const Route = createFileRoute("/_app/usp/kegiatan/penerimaan-kas")({
  head: () => ({ meta: [{ title: "Penerimaan Kas · BUMDes" }] }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  return <PenerimaanKasForm onClose={() => navigate({ to: "/usp/kegiatan" })} />;
}
