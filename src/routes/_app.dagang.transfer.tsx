import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dagang/transfer")({
  beforeLoad: () => {
    throw redirect({ to: "/usp/transfer" });
  },
});
