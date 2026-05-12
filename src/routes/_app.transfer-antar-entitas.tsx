import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/transfer-antar-entitas")({
  beforeLoad: () => {
    throw redirect({ to: "/usp/transfer" });
  },
});
