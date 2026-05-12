import { createFileRoute } from "@tanstack/react-router";
import RekonsiliasiPusat from "./_app.laporan.rekonsiliasi-rk";

export const Route = createFileRoute("/_app/usp/laporan/rekonsiliasi-rk")({
  head: () => ({ meta: [{ title: "Rekonsiliasi RK USP · BUMDes" }] }),
  component: () => {
    const Component = RekonsiliasiPusat.options.component!;
    return <Component />;
  },
});
