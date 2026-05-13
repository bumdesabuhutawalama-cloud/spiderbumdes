import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PengeluaranOperasionalForm } from "@/components/general-activities";

export const Route = createFileRoute("/_app/usp/kegiatan/pengeluaran")({
  head: () => ({ meta: [{ title: "Pengeluaran Operasional · BUMDes" }] }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  return <PengeluaranOperasionalForm onClose={() => navigate({ to: "/usp/kegiatan" })} />;
}
