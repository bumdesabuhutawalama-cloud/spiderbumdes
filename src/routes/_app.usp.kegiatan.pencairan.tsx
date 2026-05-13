import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PencairanPinjamanDialog } from "@/components/usp-dialogs";

export const Route = createFileRoute("/_app/usp/kegiatan/pencairan")({
  head: () => ({ meta: [{ title: "Pencairan Pinjaman USP · BUMDes" }] }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  return <PencairanPinjamanDialog onClose={() => navigate({ to: "/usp/kegiatan" })} />;
}
