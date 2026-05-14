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
  Store,
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
      <div
        className="flex items-center gap-3 px-5 py-5 border-b"
        style={{ borderColor: "var(--border-soft)" }}
      >
        <div
          className="grid h-11 w-11 place-items-center rounded-xl"
          style={{ background: "var(--grad-navy)", boxShadow: "var(--shadow-btn)" }}
        >
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-brand">BUMDes</p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-brand-muted">
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
            <div className="my-3 border-t" style={{ borderColor: "var(--border-soft)" }} />
            <NavLink item={{ to: "/pusat/kegiatan", label: "Catat Kegiatan", icon: ClipboardList }} active={isActive("/pusat/kegiatan")} onNavigate={onNavigate} />
            <NavLink item={{ to: "/jurnal-koreksi", label: "Jurnal Koreksi", icon: FileEdit }} active={isActive("/jurnal-koreksi")} onNavigate={onNavigate} />
            <NavLink item={{ to: "/usp", label: "Unit Simpan Pinjam", icon: HandCoins }} active={isActive("/usp")} onNavigate={onNavigate} />
            <NavLink item={{ to: "/dagang", label: "Unit Perdagangan", icon: Store }} active={isActive("/dagang")} onNavigate={onNavigate} />
            <NavLink item={{ to: "/pengaturan/users", label: "Manajemen User", icon: Users }} active={isActive("/pengaturan/users")} onNavigate={onNavigate} />
            <NavLink item={{ to: "/pengaturan", label: "Pengaturan", icon: Settings }} active={isActive("/pengaturan")} onNavigate={onNavigate} />
          </>
        )}

        {isUnit && role?.unitCode === "DAGANG" && (
          <>
            <NavLink item={{ to: "/dagang", label: "Dashboard Dagang", icon: LayoutDashboard }} active={path === "/dagang"} onNavigate={onNavigate} />
            <NavLink item={{ to: "/dagang/kegiatan", label: "Catat Kegiatan", icon: ClipboardList }} active={isActive("/dagang/kegiatan")} onNavigate={onNavigate} />
            <NavLink item={{ to: "/dagang/stok", label: "Stok Barang", icon: Store }} active={isActive("/dagang/stok")} onNavigate={onNavigate} />
            <NavLink item={{ to: "/dagang/transfer", label: "Transfer Antar Unit", icon: GitCompare }} active={isActive("/dagang/transfer")} onNavigate={onNavigate} />
            <NavLink item={{ to: "/dagang/laporan", label: "Laporan Dagang", icon: FileBarChart }} active={isActive("/dagang/laporan")} onNavigate={onNavigate} />
            <NavLink item={{ to: "/jurnal-koreksi", label: "Jurnal Koreksi", icon: FileEdit }} active={isActive("/jurnal-koreksi")} onNavigate={onNavigate} />
          </>
        )}

        {isUnit && role?.unitCode !== "DAGANG" && (
          <>
            <NavLink item={{ to: "/usp", label: "Dashboard USP", icon: LayoutDashboard }} active={path === "/usp"} onNavigate={onNavigate} />
            <NavLink item={{ to: "/usp/pinjaman", label: "Data Pinjaman", icon: HandCoins }} active={isActive("/usp/pinjaman")} onNavigate={onNavigate} />
            <NavLink item={{ to: "/usp/kegiatan", label: "Catat Kegiatan", icon: ClipboardList }} active={isActive("/usp/kegiatan")} onNavigate={onNavigate} />
            <NavLink item={{ to: "/usp/transfer", label: "Transfer", icon: GitCompare }} active={isActive("/usp/transfer")} onNavigate={onNavigate} />
            <NavLink item={{ to: "/usp/laporan", label: "Laporan USP", icon: FileBarChart }} active={isActive("/usp/laporan")} onNavigate={onNavigate} />
            <NavLink item={{ to: "/jurnal-koreksi", label: "Jurnal Koreksi", icon: FileEdit }} active={isActive("/jurnal-koreksi")} onNavigate={onNavigate} />
          </>
        )}
      </nav>

      <div className="border-t p-3" style={{ borderColor: "var(--border-soft)" }}>
        <button
          onClick={() => void signOut()}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-brand-muted transition-all hover:bg-red-50 hover:text-red-600"
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
    <aside
      className="hidden md:flex sticky top-0 h-screen w-64 shrink-0 flex-col surface-glass"
      style={{ borderRight: "1px solid var(--border-soft)" }}
    >
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

  useEffect(() => {
    onOpenChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

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
        className="absolute inset-0"
        style={{ background: "rgba(11,31,68,0.35)", backdropFilter: "blur(6px)" }}
        onClick={() => onOpenChange(false)}
      />
      <aside
        className={cn(
          "absolute left-0 top-0 h-full w-[80vw] max-w-xs flex flex-col bg-white transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ boxShadow: "var(--shadow-lg)", borderRight: "1px solid var(--border-soft)" }}
      >
        <button
          onClick={() => onOpenChange(false)}
          aria-label="Tutup menu"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg border bg-white text-brand-muted hover:text-brand"
          style={{ borderColor: "var(--border-soft)" }}
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
  onNavigate,
}: {
  item: Item;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
        active
          ? "text-white"
          : "text-brand-muted hover:bg-[var(--blue-50)] hover:text-brand",
      )}
      style={
        active
          ? { background: "var(--grad-navy)", boxShadow: "var(--shadow-sm)" }
          : undefined
      }
    >
      <Icon
        className={cn(
          "h-4 w-4 transition-colors",
          active ? "text-white" : "group-hover:text-[var(--blue-500)]",
        )}
      />
      <span>{item.label}</span>
    </Link>
  );
}
