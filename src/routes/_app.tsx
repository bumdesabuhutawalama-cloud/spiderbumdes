import { useState, useEffect } from "react";
import {
  createFileRoute,
  Outlet,
  useRouterState,
  useNavigate,
  Navigate,
} from "@tanstack/react-router";
import { ChevronDown, Search, Bell, Menu, Building2, LogOut, Loader2 } from "lucide-react";
import { CinematicBackground } from "@/components/CinematicBackground";
import { AppSidebar, MobileSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

const PUSAT_ONLY_PREFIXES = ["/dashboard", "/coa", "/laporan", "/pengaturan", "/pusat"];

function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { initialized, isAuthenticated, isPusat, isUnit, role } = useAuth();
  const navigate = useNavigate();

  // Redirect non-authenticated to /login
  useEffect(() => {
    if (initialized && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [initialized, isAuthenticated, navigate]);

  if (!initialized) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  // Authorization guards
  if (isUnit) {
    const unitHome = role?.unitCode === "DAGANG" ? "/dagang" : "/usp";
    const isPusatRoute = PUSAT_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
    if (isPusatRoute) {
      return <Navigate to={unitHome} />;
    }
    if (pathname.startsWith("/usp") && role?.unitCode && role.unitCode !== "USP") {
      return <Navigate to={unitHome} />;
    }
    if (pathname.startsWith("/dagang") && role?.unitCode && role.unitCode !== "DAGANG") {
      return <Navigate to={unitHome} />;
    }
  }

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
  const { role, user, signOut, isPusat } = useAuth();
  const [open, setOpen] = useState(false);
  const initials = (user?.email ?? "U")
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

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
        Live · {isPusat ? "Konsolidasi BUMDes" : `Modul ${role?.unitName ?? "Unit"}`}
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

      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/50 px-2 py-1.5 sm:pr-3 hover:border-[var(--neon-cyan)]/50 transition"
        >
          <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-green)] text-[oklch(0.15_0.03_250)] text-xs font-bold">
            {initials}
          </div>
          <div className="hidden sm:block text-left leading-tight">
            <p className="text-xs font-medium">{user?.email ?? "—"}</p>
            <p className="text-[10px] text-muted-foreground">
              {isPusat ? "Admin Pusat" : `Admin ${role?.unitCode ?? "Unit"}`}
            </p>
          </div>
          <ChevronDown className="hidden sm:block h-4 w-4 text-muted-foreground" />
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border/60 bg-background/95 backdrop-blur-xl shadow-xl py-1 z-50">
            <button
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
