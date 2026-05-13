import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/usp/kegiatan")({
  head: () => ({ meta: [{ title: "Catat Kegiatan · BUMDes" }] }),
  component: () => <Outlet />,
});
