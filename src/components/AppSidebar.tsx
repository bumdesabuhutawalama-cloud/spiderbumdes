import { useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  BookOpenText,
  FileBarChart,
  Settings,
  LogOut,
  Building2,
  HandCoins,
  GitCompare,
  ClipboardList,
  Users,
  FileEdit,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const main: Item[] = [
  { to: "/", label: "Dashboard Pusat", icon: LayoutDashboard },
  { to: "/coa", label: "Bagan Akun / COA", icon: BookOpenText },
];


function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { isPusat, isUnit, role, signOut } = useAuth();

  const isActive = (to: string) =>
    to === "/" ? path === "/" : path === to || path.startsWith(to + "/");

  return (
    <>
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border/60">
        <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-green)]">
          <Building2 className="h-5 w-5 text-[oklch(0.15_0.03_250)]" />
          <div className="absolute inset-0 rounded-xl glow-cyan" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-wide">BUMDes</p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {isPusat ? "Unit Pusat" : role?.unitName ?? "Unit"}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {isPusat && (
          <>
            {main.map((item) => (
              <NavLink key={item.to} item={item} active={isActive(item.to)} onNavigate={onNavigate} />
            ))}

            <NavLink
              item={{ to: "/laporan-pusat", label: "Laporan Pusat", icon: FileBarChart }}
              active={isActive("/laporan-pusat") || path.startsWith("/laporan/")}
              onNavigate={onNavigate}
            />

            <div className="my-2 border-t border-border/40" />

            <NavLink
              item={{ to: "/pusat/kegiatan", label: "Catat Kegiatan", icon: ClipboardList }}
              active={isActive("/pusat/kegiatan")}
              onNavigate={onNavigate}
            />

            <NavLink
              item={{ to: "/jurnal-koreksi", label: "Jurnal Koreksi", icon: FileEdit }}
              active={isActive("/jurnal-koreksi")}
              onNavigate={onNavigate}
            />

            <NavLink
              item={{ to: "/usp", label: "Unit Simpan Pinjam", icon: HandCoins }}
              active={isActive("/usp")}
              onNavigate={onNavigate}
            />

            <NavLink
              item={{ to: "/pengaturan/users", label: "Manajemen User", icon: Users }}
              active={isActive("/pengaturan/users")}
              onNavigate={onNavigate}
            />

            <NavLink
              item={{ to: "/pengaturan", label: "Pengaturan", icon: Settings }}
              active={isActive("/pengaturan")}
              onNavigate={onNavigate}
            />
          </>
        )}

        {isUnit && (
          <>
            <NavLink
              item={{ to: "/usp", label: "Dashboard USP", icon: LayoutDashboard }}
              active={path === "/usp"}
              onNavigate={onNavigate}
            />
            <NavLink
              item={{ to: "/usp/pinjaman", label: "Data Pinjaman", icon: HandCoins }}
              active={isActive("/usp/pinjaman")}
              onNavigate={onNavigate}
            />
            <NavLink
              item={{ to: "/usp/kegiatan", label: "Catat Kegiatan", icon: ClipboardList }}
              active={isActive("/usp/kegiatan")}
              onNavigate={onNavigate}
            />
            <NavLink
              item={{ to: "/usp/transfer", label: "Transfer", icon: GitCompare }}
              active={isActive("/usp/transfer")}
              onNavigate={onNavigate}
            />
            <NavLink
              item={{ to: "/usp/laporan", label: "Laporan USP", icon: FileBarChart }}
              active={isActive("/usp/laporan")}
              onNavigate={onNavigate}
            />
          </>
        )}
      </nav>

      <div className="border-t border-border/60 p-3">
        <button
          onClick={() => void signOut()}
          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-all hover:bg-destructive/15 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden md:flex sticky top-0 h-screen w-64 shrink-0 flex-col glass-card rounded-none border-y-0 border-l-0">
      <SidebarInner />
    </aside>
  );
}

export function MobileSidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });

  // Close drawer on route change
  useEffect(() => {
    onOpenChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div
      className={cn(
        "md:hidden fixed inset-0 z-50 transition-opacity duration-300",
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <aside
        className={cn(
          "absolute left-0 top-0 h-full w-[80vw] max-w-xs flex flex-col glass-card rounded-none border-y-0 border-l-0 transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <button
          onClick={() => onOpenChange(false)}
          aria-label="Tutup menu"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg border border-border/60 bg-secondary/60 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <SidebarInner onNavigate={() => onOpenChange(false)} />
      </aside>
    </div>
  );
}

function NavLink({
  item,
  active,
  dense,
  onNavigate,
}: {
  item: Item;
  active: boolean;
  dense?: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 text-sm transition-all",
        dense ? "py-2" : "py-2.5",
        active
          ? "bg-secondary/80 text-foreground"
          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--neon-cyan)] shadow-[0_0_12px_var(--neon-cyan)]" />
      )}
      <Icon
        className={cn(
          "h-4 w-4 transition-colors",
          active ? "text-[var(--neon-cyan)]" : "group-hover:text-[var(--neon-cyan)]",
        )}
      />
      <span>{item.label}</span>
    </Link>
  );
}
