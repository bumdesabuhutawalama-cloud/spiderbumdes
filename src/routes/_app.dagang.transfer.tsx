import { createFileRoute } from "@tanstack/react-router";
import { Route as UspTransferRoute } from "./_app.usp.transfer";

export const Route = createFileRoute("/_app/dagang/transfer")({
  head: () => ({ meta: [{ title: "Transfer Antar Unit · BUMDes" }] }),
  component: () => {
    const Component = UspTransferRoute.options.component!;
    return <Component />;
  },
});
