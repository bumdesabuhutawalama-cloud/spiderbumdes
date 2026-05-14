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

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const LoginCta = isAuthenticated ? (
    <Link to={dashboardTo} preload="intent" className="btn-primary">
      <LayoutDashboard className="h-4 w-4" /> Buka dashboard
    </Link>
  ) : (
    <Link to="/login" preload="intent" className="btn-primary">
      <LogIn className="h-4 w-4" /> Login
    </Link>
  );

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur-xl transition-shadow duration-200"
      style={{
        background: "rgba(255,255,255,0.92)",
        borderColor: "var(--border-soft)",
        boxShadow: scrolled ? "0 6px 20px -10px rgba(11,31,68,0.18)" : "none",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" preload="intent">
          <div
            className="grid h-10 w-10 place-items-center rounded-xl"
            style={{ background: "var(--grad-navy)", boxShadow: "var(--shadow-btn)" }}
          >
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-brand">BUMDes</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">
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
              activeProps={{
                className: "text-[var(--navy-800)] bg-[var(--blue-50)]",
              }}
              inactiveProps={{
                className: "text-brand-muted hover:text-brand hover:bg-[var(--blue-50)]/60",
              }}
              className="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">{LoginCta}</div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Tutup menu" : "Buka menu"}
          aria-expanded={open}
          className="ml-auto grid h-10 w-10 place-items-center rounded-xl border bg-white text-brand transition hover:border-[var(--blue-500)]/50 md:hidden"
          style={{ borderColor: "var(--border-soft)", boxShadow: "var(--shadow-sm)" }}
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
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
          style={{ background: "rgba(11,31,68,0.25)", backdropFilter: "blur(6px)" }}
        />

        <div
          className={`relative mx-4 mt-3 overflow-hidden rounded-2xl bg-white transition-all duration-300 ${
            open ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
          }`}
          style={{
            border: "1px solid var(--border-soft)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <nav className="flex flex-col p-2">
            {navItems.map((item, idx) => (
              <Link
                key={item.to}
                to={item.to}
                preload="intent"
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{
                  className: "text-brand bg-[var(--blue-50)]",
                }}
                inactiveProps={{
                  className: "text-brand-muted hover:text-brand hover:bg-[var(--surface-2)]",
                }}
                className="rounded-xl px-4 py-3 text-base font-medium transition-all duration-200"
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
                <Link to={dashboardTo} preload="intent" className="btn-primary w-full">
                  <LayoutDashboard className="h-4 w-4" /> Buka dashboard
                </Link>
              ) : (
                <Link to="/login" preload="intent" className="btn-primary w-full">
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
