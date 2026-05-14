import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dagang/laporan")({
  head: () => ({ meta: [{ title: "Laporan Dagang · BUMDes" }] }),
  component: () => <Outlet />,
});
