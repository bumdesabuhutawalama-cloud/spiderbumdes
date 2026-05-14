import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DagangNav } from "@/components/DagangNav";

export const Route = createFileRoute("/_app/dagang")({
  head: () => ({ meta: [{ title: "Unit Perdagangan · BUMDes" }] }),
  component: DagangLayout,
});

function DagangLayout() {
  return (
    <>
      <DagangNav />
      <Outlet />
    </>
  );
}
