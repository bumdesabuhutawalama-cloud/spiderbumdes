import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TerimaDendaDialog } from "@/components/usp-dialogs";

export const Route = createFileRoute("/_app/usp/kegiatan/denda")({
  head: () => ({ meta: [{ title: "Terima Denda USP · BUMDes" }] }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  return <TerimaDendaDialog onClose={() => navigate({ to: "/usp/kegiatan" })} />;
}
