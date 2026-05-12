import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ListChecks,
  ClipboardList,
  ArrowLeftRight,
  FileBarChart,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

const items = [
  { to: "/usp", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/usp/pinjaman", label: "Data Pinjaman", icon: ListChecks },
  { to: "/usp/kegiatan", label: "Catat Kegiatan", icon: ClipboardList },
  { to: "/usp/transfer", label: "Transfer Antar Entitas", icon: ArrowLeftRight },
  { to: "/usp/laporan", label: "Laporan USP", icon: FileBarChart },
] as const;

export function UspNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const current = items.find((i) =>
    i.exact ? path === i.to : path === i.to || path.startsWith(i.to + "/"),
  );

  return (
    <div className="mb-5 space-y-3">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/" className="inline-flex items-center gap-1 hover:text-foreground transition">
          <ArrowLeft className="h-3.5 w-3.5" /> Unit Pusat
        </Link>
        <ChevronRight className="h-3.5 w-3.5 opacity-50" />
        <span className="text-foreground/80">Unit Simpan Pinjam</span>
        {current && current.to !== "/usp" && (
          <>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            <span className="text-[var(--neon-cyan)]">{current.label}</span>
          </>
        )}
      </nav>

      {/* Internal nav tabs */}
      <div className="flex flex-wrap gap-2">
        {items.map((it) => {
          const active = it.exact
            ? path === it.to
            : path === it.to || path.startsWith(it.to + "/");
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                active
                  ? "border-[var(--neon-cyan)]/60 bg-[var(--neon-cyan)]/10 text-foreground"
                  : "border-white/10 bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Icon className="h-4 w-4" />
              {it.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
