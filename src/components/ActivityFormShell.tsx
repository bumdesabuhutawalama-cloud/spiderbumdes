import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/DashboardLayout";

/**
 * Wrapper untuk halaman form "Catat Kegiatan".
 * Menggantikan modal/dialog lama agar form jadi halaman penuh dengan
 * scroll natural dan back-button browser yang berfungsi.
 */
export function ActivityFormShell({
  title,
  subtitle,
  icon,
  accent = "from-[var(--neon-cyan)] to-[var(--neon-green)]",
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle ?? "Sistem akan otomatis menyiapkan jurnal sesuai kaidah akuntansi."}
        actions={
          <Link
            to="/usp/kegiatan"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-secondary/40 px-3 py-1.5 text-xs hover:bg-secondary transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali
          </Link>
        }
      />
      <div className="glass-card relative w-full max-w-3xl mx-auto rounded-2xl border border-white/10 p-4 sm:p-5 shadow-[0_0_60px_rgba(34,211,238,0.15)]">
        <div className="mb-3 flex items-center gap-2">
          <span
            className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${accent} text-[oklch(0.15_0.03_250)]`}
          >
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold leading-tight">{title}</h2>
          </div>
        </div>
        {children}
      </div>
    </>
  );
}
