import { createFileRoute, Outlet } from "@tanstack/react-router";
import { UspNav } from "@/components/UspNav";

export const Route = createFileRoute("/_app/usp")({
  head: () => ({ meta: [{ title: "Unit Simpan Pinjam · BUMDes" }] }),
  component: UspLayout,
});

function UspLayout() {
  return (
    <>
      <UspNav />
      <Outlet />
    </>
  );
}
