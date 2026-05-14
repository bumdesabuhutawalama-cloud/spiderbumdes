import { useState } from "react";
import { ChevronDown, Search, Bell, Menu, Building2 } from "lucide-react";
import { CinematicBackground } from "./CinematicBackground";
import { AppSidebar, MobileSidebar } from "./AppSidebar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="relative min-h-screen text-foreground">
      <CinematicBackground />

      <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />

      <div className="flex">
        <AppSidebar />

        <div className="flex-1 min-w-0">
          <Header onOpenMenu={() => setMobileOpen(true)} />
          <main className="px-4 sm:px-5 md:px-8 py-5 md:py-8 max-w-[1400px] mx-auto animate-fade-in-up">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className="sticky top-0 z-40 flex h-14 md:h-16 items-center gap-2 sm:gap-4 border-b px-3 sm:px-5 md:px-8 backdrop-blur-xl transition-shadow duration-200"
      style={{
        background: "rgba(255,255,255,0.92)",
        borderColor: "var(--border-soft)",
        boxShadow: scrolled ? "0 6px 20px -10px rgba(11,31,68,0.18)" : "none",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      {/* Mobile hamburger */}
      <button
        onClick={onOpenMenu}
        aria-label="Buka menu"
        className="md:hidden grid h-9 w-9 place-items-center rounded-lg border bg-white text-brand-muted hover:text-brand transition"
        style={{ borderColor: "var(--border-soft)" }}
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Mobile brand */}
      <div className="md:hidden flex items-center gap-2">
        <div
          className="grid h-8 w-8 place-items-center rounded-lg"
          style={{ background: "var(--grad-navy)" }}
        >
          <Building2 className="h-4 w-4 text-white" />
        </div>
        <p className="text-sm font-semibold text-brand">BUMDes</p>
      </div>

      <div className="hidden md:flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-brand-muted">
        <span
          className="h-1.5 w-1.5 rounded-full animate-pulse-glow"
          style={{ background: "var(--blue-500)", boxShadow: "0 0 10px var(--blue-500)" }}
        />
        Live · Sistem Konsolidasi BUMDes
      </div>

      <div
        className="ml-auto hidden lg:flex items-center gap-2 rounded-xl border bg-white/70 px-3 py-1.5 text-sm text-brand-muted w-72"
        style={{ borderColor: "var(--border-soft)" }}
      >
        <Search className="h-4 w-4" />
        <input
          placeholder="Cari akun, unit usaha, laporan..."
          className="flex-1 bg-transparent outline-none placeholder:text-brand-muted/70 text-brand"
        />
      </div>

      <button
        className="ml-auto lg:ml-0 relative grid h-9 w-9 place-items-center rounded-lg border bg-white text-brand-muted hover:text-brand transition"
        style={{ borderColor: "var(--border-soft)" }}
      >
        <Bell className="h-4 w-4" />
        <span
          className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full"
          style={{ background: "var(--blue-500)", boxShadow: "0 0 8px var(--blue-500)" }}
        />
      </button>

      <button
        className="flex items-center gap-2 rounded-xl border bg-white px-2 py-1.5 sm:pr-3 hover:border-[var(--blue-500)]/50 transition"
        style={{ borderColor: "var(--border-soft)" }}
      >
        <div
          className="grid h-7 w-7 place-items-center rounded-md text-xs font-bold text-white"
          style={{ background: "var(--grad-navy)" }}
        >
          AD
        </div>
        <div className="hidden sm:block text-left leading-tight">
          <p className="text-xs font-medium text-brand">Admin Direktur</p>
          <p className="text-[10px] text-brand-muted">BUMDes Pusat</p>
        </div>
        <ChevronDown className="hidden sm:block h-4 w-4 text-brand-muted" />
      </button>
    </header>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 md:mb-6 flex flex-wrap items-end justify-between gap-3 md:gap-4">
      <div>
        <p
          className="text-[10px] md:text-xs font-medium uppercase tracking-[0.2em]"
          style={{ color: "var(--blue-500)" }}
        >
          BUMDes · Admin Pusat
        </p>
        <h1 className="mt-1 font-display text-xl sm:text-2xl md:text-3xl font-bold text-brand">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-xs sm:text-sm text-brand-muted">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2 w-full sm:w-auto">{actions}</div>}
    </div>
  );
}
