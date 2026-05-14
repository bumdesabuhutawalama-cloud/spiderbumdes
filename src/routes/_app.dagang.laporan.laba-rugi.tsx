import { createFileRoute } from "@tanstack/react-router";
import { Route as LabaRugiRoute } from "./_app.laporan.laba-rugi";

export const Route = createFileRoute("/_app/dagang/laporan/laba-rugi")({
  head: () => ({ meta: [{ title: "Laba Rugi Dagang · BUMDes" }] }),
  component: () => {
    const Component = LabaRugiRoute.options.component!;
    return <Component />;
  },
});
