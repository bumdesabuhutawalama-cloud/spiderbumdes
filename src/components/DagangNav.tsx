import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, ArrowLeft, ClipboardList, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const labelMap: Record<string, string> = {
  "/dagang": "Dashboard",
  "/dagang/stok": "Stok",
  "/dagang/kegiatan": "Catat Kegiatan",
  "/dagang/transfer": "Transfer Antar Unit",
  "/dagang/laporan": "Laporan Dagang",
};

export function DagangNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { isPusat } = useAuth();
  const currentKey = Object.keys(labelMap).find((k) =>
    k === "/dagang" ? path === k : path === k || path.startsWith(k + "/"),
  );
  const currentLabel = currentKey && currentKey !== "/dagang" ? labelMap[currentKey] : null;

  return (
    <div className="mb-5 space-y-3">
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {isPusat ? (
          <Link to="/" className="inline-flex items-center gap-1 hover:text-foreground transition">
            <ArrowLeft className="h-3.5 w-3.5" /> Unit Pusat
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 text-foreground/60">Modul</span>
        )}
        <ChevronRight className="h-3.5 w-3.5 opacity-50" />
        <span className="text-foreground/80">Unit Perdagangan</span>
        {currentLabel && (
          <>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            <span className="text-[var(--neon-cyan)]">{currentLabel}</span>
          </>
        )}
      </nav>

      <Link
        to="/dagang/kegiatan"
        preload="intent"
        className="group relative block overflow-hidden rounded-2xl border border-[var(--neon-cyan)]/40 bg-gradient-to-br from-[var(--neon-cyan)]/15 via-[var(--neon-green)]/10 to-transparent p-4 sm:p-5 shadow-[0_0_40px_rgba(34,211,238,0.15)] transition hover:shadow-[0_0_60px_rgba(34,211,238,0.3)]"
      >
        <div className="relative flex items-center gap-4">
          <span className="grid h-12 w-12 sm:h-14 sm:w-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-green)] text-[oklch(0.15_0.03_250)] shadow-lg">
            <ClipboardList className="h-6 w-6 sm:h-7 sm:w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-semibold leading-tight">Catat Kegiatan</h3>
            <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
              Pembelian, penjualan, HPP otomatis, piutang & utang
            </p>
          </div>
          <span className="inline-flex items-center justify-center h-9 w-9 sm:h-auto sm:w-auto sm:px-3 sm:py-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] text-[oklch(0.15_0.03_250)] shadow-md sm:gap-1.5 sm:text-sm sm:font-medium">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Tambah Kegiatan</span>
          </span>
        </div>
      </Link>
    </div>
  );
}
