import { createFileRoute } from "@tanstack/react-router";
import LabaRugiPusat from "./_app.laporan.laba-rugi";

// Reuse the same Laba Rugi page, but mounted under /usp/* so the USP
// sidebar/breadcrumb context stays active.
export const Route = createFileRoute("/_app/usp/laporan/laba-rugi")({
  head: () => ({ meta: [{ title: "Laba Rugi USP · BUMDes" }] }),
  component: () => {
    const Component = LabaRugiPusat.options.component!;
    return <Component />;
  },
});
