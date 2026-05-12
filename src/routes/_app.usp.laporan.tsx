import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/usp/laporan")({
  head: () => ({ meta: [{ title: "Laporan USP · BUMDes" }] }),
  component: () => <Outlet />,
});
