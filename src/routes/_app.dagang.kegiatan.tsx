import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dagang/kegiatan")({
  head: () => ({ meta: [{ title: "Catat Kegiatan Dagang · BUMDes" }] }),
  component: () => <Outlet />,
});
