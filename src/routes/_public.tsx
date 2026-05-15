import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { CinematicBackground } from "@/components/CinematicBackground";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
});

function PublicLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="relative h-screen overflow-hidden flex flex-col text-foreground">
      <CinematicBackground />
      <PublicHeader />
      <main
        id="public-scroll"
        key={pathname}
        className="flex-1 overflow-y-auto scroll-smooth animate-fade-in-up"
      >
        <Outlet />
        <PublicFooter />
      </main>
    </div>
  );
}
