import { useState } from "react";
import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Search, Bell, Menu, Building2 } from "lucide-react";
import { CinematicBackground } from "@/components/CinematicBackground";
import { AppSidebar, MobileSidebar } from "@/components/AppSidebar";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="relative min-h-screen text-foreground">
      <CinematicBackground />

      <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />

      <div className="flex">
        <AppSidebar />

        <div className="flex-1 min-w-0">
          <Header onOpenMenu={() => setMobileOpen(true)} />
          <main
            key={pathname}
            className="px-4 sm:px-5 md:px-8 py-5 md:py-8 max-w-[1400px] mx-auto animate-fade-in-up"
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 md:h-16 items-center gap-2 sm:gap-4 border-b border-border/60 bg-background/40 px-3 sm:px-5 md:px-8 backdrop-blur-xl">
      <button
        onClick={onOpenMenu}
        aria-label="Buka menu"
        className="md:hidden grid h-9 w-9 place-items-center rounded-lg border border-border/60 bg-secondary/50 text-muted-foreground hover:text-foreground transition"
      >
        <Menu className="h-4.5 w-4.5" />
      </button>

      <div className="md:hidden flex items-center gap-2">
        <div className="relative grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-green)]">
          <Building2 className="h-4 w-4 text-[oklch(0.15_0.03_250)]" />
        </div>
        <p className="text-sm font-semibold tracking-wide">BUMDes</p>
      </div>

      <div className="hidden md:flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--neon-green)] shadow-[0_0_10px_var(--neon-green)] animate-pulse-glow" />
        Live · Sistem Konsolidasi BUMDes
      </div>

      <div className="ml-auto hidden lg:flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/50 px-3 py-1.5 text-sm text-muted-foreground w-72">
        <Search className="h-4 w-4" />
        <input
          placeholder="Cari akun, unit usaha, laporan..."
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70"
        />
      </div>

      <button className="ml-auto lg:ml-0 relative grid h-9 w-9 place-items-center rounded-lg border border-border/60 bg-secondary/50 text-muted-foreground hover:text-foreground transition">
        <Bell className="h-4 w-4" />
        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--neon-cyan)] shadow-[0_0_8px_var(--neon-cyan)]" />
      </button>

      <button className="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/50 px-2 py-1.5 sm:pr-3 hover:border-[var(--neon-cyan)]/50 transition">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-green)] text-[oklch(0.15_0.03_250)] text-xs font-bold">
          AD
        </div>
        <div className="hidden sm:block text-left leading-tight">
          <p className="text-xs font-medium">Admin Direktur</p>
          <p className="text-[10px] text-muted-foreground">BUMDes Pusat</p>
        </div>
        <ChevronDown className="hidden sm:block h-4 w-4 text-muted-foreground" />
      </button>
    </header>
  );
}
