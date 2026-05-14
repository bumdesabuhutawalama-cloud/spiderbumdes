import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, ArrowLeft, ClipboardList, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const labelMap: Record<string, string> = {
  "/usp": "Dashboard",
  "/usp/pinjaman": "Data Pinjaman",
  "/usp/kegiatan": "Catat Kegiatan",
  "/usp/transfer": "Transfer Antar Entitas",
  "/usp/laporan": "Laporan USP",
};

export function UspNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { isPusat } = useAuth();

  const currentKey = Object.keys(labelMap).find((k) =>
    k === "/usp" ? path === k : path === k || path.startsWith(k + "/"),
  );
  const currentLabel = currentKey && currentKey !== "/usp" ? labelMap[currentKey] : null;

  return (
    <div className="mb-5 space-y-3">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {isPusat ? (
          <Link to="/" className="inline-flex items-center gap-1 hover:text-foreground transition">
            <ArrowLeft className="h-3.5 w-3.5" /> Unit Pusat
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 text-foreground/60">Modul</span>
        )}
        <ChevronRight className="h-3.5 w-3.5 opacity-50" />
        <span className="text-foreground/80">Unit Simpan Pinjam</span>
        {currentLabel && (
          <>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            <span className="text-[var(--neon-cyan)]">{currentLabel}</span>
          </>
        )}
      </nav>

      {/* Global Action Card — Catat Kegiatan */}
      <Link
        to="/usp/kegiatan"
        preload="intent"
        className="group relative block overflow-hidden rounded-2xl border border-[var(--neon-cyan)]/40 bg-gradient-to-br from-[var(--neon-cyan)]/15 via-[var(--neon-green)]/10 to-transparent p-4 sm:p-5 shadow-[0_0_40px_rgba(34,211,238,0.15)] transition hover:shadow-[0_0_60px_rgba(34,211,238,0.3)] hover:border-[var(--neon-cyan)]/70"
      >
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br from-[var(--neon-cyan)]/10 to-[var(--neon-green)]/10 transition-opacity pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <span className="grid h-12 w-12 sm:h-14 sm:w-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-green)] text-[oklch(0.15_0.03_250)] shadow-lg">
            <ClipboardList className="h-6 w-6 sm:h-7 sm:w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-semibold leading-tight">Catat Kegiatan</h3>
            <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
              Input transaksi, angsuran, pencairan, dan aktivitas USP
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] px-3 py-2 text-sm font-medium text-[oklch(0.15_0.03_250)] shadow-md group-hover:scale-[1.03] transition-transform">
            <Plus className="h-4 w-4" />
            Tambah Kegiatan
          </span>
          <span className="sm:hidden inline-flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] text-[oklch(0.15_0.03_250)] shadow-md">
            <Plus className="h-4 w-4" />
          </span>
        </div>
      </Link>
    </div>
  );
}
