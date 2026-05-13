import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BebanOperasionalUspDialog } from "@/components/usp-dialogs";

export const Route = createFileRoute("/_app/usp/kegiatan/beban")({
  head: () => ({ meta: [{ title: "Beban Operasional USP · BUMDes" }] }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  return <BebanOperasionalUspDialog onClose={() => navigate({ to: "/usp/kegiatan" })} />;
}
