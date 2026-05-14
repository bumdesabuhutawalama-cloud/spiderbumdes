import { Link } from "@tanstack/react-router";
import { Building2, LogIn, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { to: "/", label: "Beranda" },
  { to: "/tentang", label: "Tentang" },
  { to: "/unit-usaha", label: "Unit usaha" },
  { to: "/transparansi", label: "Transparansi" },
  { to: "/kontak", label: "Kontak" },
] as const;

export function PublicHeader() {
  const { isAuthenticated, isPusat } = useAuth();
  const dashboardTo = isPusat ? "/dashboard" : "/usp";

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2" preload="intent">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-green)]">
            <Building2 className="h-5 w-5 text-[oklch(0.15_0.03_250)]" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-wide">BUMDes</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Inovasi desa
            </p>
          </div>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              preload="intent"
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-foreground bg-secondary/60" }}
              inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
              className="rounded-lg px-3 py-2 text-sm transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {isAuthenticated ? (
          <Link
            to={dashboardTo}
            preload="intent"
            className="ml-auto inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] px-3.5 py-2 text-sm font-semibold text-[oklch(0.15_0.03_250)] transition hover:opacity-90 md:ml-0"
          >
            <LayoutDashboard className="h-4 w-4" /> Buka dashboard
          </Link>
        ) : (
          <Link
            to="/login"
            preload="intent"
            className="ml-auto inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] px-3.5 py-2 text-sm font-semibold text-[oklch(0.15_0.03_250)] transition hover:opacity-90 md:ml-0"
          >
            <LogIn className="h-4 w-4" /> Login
          </Link>
        )}
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto border-t border-border/40 px-4 py-2 md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            preload="intent"
            activeOptions={{ exact: item.to === "/" }}
            activeProps={{ className: "text-foreground bg-secondary/60" }}
            inactiveProps={{ className: "text-muted-foreground" }}
            className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
