import { createFileRoute } from "@tanstack/react-router";
import { Route as RekonRoute } from "./_app.laporan.rekonsiliasi-rk";

export const Route = createFileRoute("/_app/usp/laporan/rekonsiliasi-rk")({
  head: () => ({ meta: [{ title: "Rekonsiliasi RK USP · BUMDes" }] }),
  component: () => {
    const Component = RekonRoute.options.component!;
    return <Component />;
  },
});
