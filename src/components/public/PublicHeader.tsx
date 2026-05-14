import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Building2, LogIn, LayoutDashboard, Menu, X } from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Close mobile menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock scroll while menu open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const LoginCta = isAuthenticated ? (
    <Link
      to={dashboardTo}
      preload="intent"
      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] px-3.5 py-2 text-sm font-semibold text-[oklch(0.15_0.03_250)] transition hover:opacity-90"
    >
      <LayoutDashboard className="h-4 w-4" /> Buka dashboard
    </Link>
  ) : (
    <Link
      to="/login"
      preload="intent"
      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] px-3.5 py-2 text-sm font-semibold text-[oklch(0.15_0.03_250)] shadow-[0_0_24px_-6px_var(--neon-cyan)] transition hover:opacity-90"
    >
      <LogIn className="h-4 w-4" /> Login
    </Link>
  );

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

        {/* Desktop nav */}
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

        <div className="ml-auto hidden md:block">{LoginCta}</div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Tutup menu" : "Buka menu"}
          aria-expanded={open}
          className="ml-auto grid h-10 w-10 place-items-center rounded-lg border border-border/60 bg-secondary/40 text-foreground transition hover:border-[var(--neon-cyan)]/50 md:hidden"
        >
          <span className="relative grid h-5 w-5 place-items-center">
            <Menu
              className={`absolute h-5 w-5 transition-all duration-200 ${
                open ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
              }`}
            />
            <X
              className={`absolute h-5 w-5 transition-all duration-200 ${
                open ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
              }`}
            />
          </span>
        </button>
      </div>

      {/* Mobile menu overlay */}
      <div
        className={`fixed inset-x-0 top-16 bottom-0 z-40 md:hidden ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-background/80 backdrop-blur-md transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Panel */}
        <div
          className={`relative mx-4 mt-3 overflow-hidden rounded-2xl border border-border/60 bg-background/95 shadow-[0_20px_60px_-20px_var(--neon-cyan)] transition-all duration-300 ${
            open
              ? "translate-y-0 opacity-100"
              : "-translate-y-4 opacity-0"
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--neon-cyan)]/8 via-transparent to-[var(--neon-green)]/8" />
          <nav className="relative flex flex-col p-2">
            {navItems.map((item, idx) => (
              <Link
                key={item.to}
                to={item.to}
                preload="intent"
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{
                  className:
                    "text-foreground bg-secondary/70 border-[var(--neon-cyan)]/40",
                }}
                inactiveProps={{
                  className: "text-muted-foreground hover:text-foreground border-transparent",
                }}
                className="rounded-xl border px-4 py-3 text-base font-medium transition-all duration-200"
                style={{
                  transitionDelay: open ? `${60 + idx * 40}ms` : "0ms",
                  transform: open ? "translateY(0)" : "translateY(-6px)",
                  opacity: open ? 1 : 0,
                }}
              >
                {item.label}
              </Link>
            ))}

            <div
              className="mt-2 px-1"
              style={{
                transitionDelay: open ? `${60 + navItems.length * 40}ms` : "0ms",
                transform: open ? "translateY(0)" : "translateY(-6px)",
                opacity: open ? 1 : 0,
                transition: "all 200ms ease-out",
              }}
            >
              {isAuthenticated ? (
                <Link
                  to={dashboardTo}
                  preload="intent"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] px-4 py-3 text-sm font-semibold text-[oklch(0.15_0.03_250)]"
                >
                  <LayoutDashboard className="h-4 w-4" /> Buka dashboard
                </Link>
              ) : (
                <Link
                  to="/login"
                  preload="intent"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] px-4 py-3 text-sm font-semibold text-[oklch(0.15_0.03_250)] shadow-[0_0_24px_-6px_var(--neon-cyan)]"
                >
                  <LogIn className="h-4 w-4" /> Login
                </Link>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
