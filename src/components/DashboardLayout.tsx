import { ChevronDown, Search, Bell } from "lucide-react";
import { CinematicBackground } from "./CinematicBackground";
import { AppSidebar } from "./AppSidebar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen text-foreground">
      <CinematicBackground />

      <div className="flex">
        <AppSidebar />

        <div className="flex-1 min-w-0">
          <Header />
          <main className="px-5 md:px-8 py-6 md:py-8 max-w-[1400px] mx-auto animate-fade-in-up">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border/60 bg-background/40 px-5 md:px-8 backdrop-blur-xl">
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

      <button className="relative grid h-9 w-9 place-items-center rounded-lg border border-border/60 bg-secondary/50 text-muted-foreground hover:text-foreground transition">
        <Bell className="h-4 w-4" />
        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--neon-cyan)] shadow-[0_0_8px_var(--neon-cyan)]" />
      </button>

      <button className="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/50 px-2 py-1.5 pr-3 hover:border-[var(--neon-cyan)]/50 transition">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-green)] text-[oklch(0.15_0.03_250)] text-xs font-bold">
          AD
        </div>
        <div className="hidden sm:block text-left leading-tight">
          <p className="text-xs font-medium">Admin Direktur</p>
          <p className="text-[10px] text-muted-foreground">BUMDes Pusat</p>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--neon-cyan)]/80 text-glow-cyan">
          BUMDes · Admin Pusat
        </p>
        <h1 className="mt-1 text-2xl md:text-3xl font-semibold">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
