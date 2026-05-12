import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/catat-kegiatan")({
  beforeLoad: () => {
    throw redirect({ to: "/usp/kegiatan" });
  },
});
