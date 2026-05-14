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
    <div className="relative flex min-h-screen flex-col text-foreground">
      <CinematicBackground />
      <PublicHeader />
      <main key={pathname} className="flex-1 animate-fade-in-up">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
