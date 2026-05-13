import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TerimaAngsuranDialog } from "@/components/usp-dialogs";

export const Route = createFileRoute("/_app/usp/kegiatan/angsuran")({
  head: () => ({ meta: [{ title: "Terima Angsuran USP · BUMDes" }] }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  return <TerimaAngsuranDialog onClose={() => navigate({ to: "/usp/kegiatan" })} />;
}
