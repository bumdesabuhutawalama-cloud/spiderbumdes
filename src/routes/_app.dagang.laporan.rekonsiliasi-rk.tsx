import { createFileRoute } from "@tanstack/react-router";
import { Route as RekonRoute } from "./_app.laporan.rekonsiliasi-rk";

export const Route = createFileRoute("/_app/dagang/laporan/rekonsiliasi-rk")({
  head: () => ({ meta: [{ title: "Rekonsiliasi RK Dagang · BUMDes" }] }),
  component: () => {
    const Component = RekonRoute.options.component!;
    return <Component />;
  },
});
