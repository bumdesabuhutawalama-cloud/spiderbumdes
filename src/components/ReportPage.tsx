import { useRef, useState } from "react";
import { Calendar, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/DashboardLayout";
import { buildReportFilename, exportElementToPdf } from "@/lib/pdf-export";

export function ReportPage({
  title,
  subtitle,
  columns,
  rows,
}: {
  title: string;
  subtitle: string;
  columns: string[];
  rows: (string | number)[][];
}) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!reportRef.current) return;
    try {
      setExporting(true);
      await exportElementToPdf(reportRef.current, buildReportFilename(title));
      toast.success("PDF berhasil diunduh");
    } catch (e) {
      toast.error("Gagal export PDF: " + (e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <>
            <div className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/60 px-3 py-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                className="bg-transparent text-sm outline-none [color-scheme:dark]"
                defaultValue="2025-01-01"
              />
              <span className="text-muted-foreground">—</span>
              <input
                type="date"
                className="bg-transparent text-sm outline-none [color-scheme:dark]"
                defaultValue="2025-12-31"
              />
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] px-4 py-2 text-sm font-medium text-[oklch(0.15_0.03_250)] glow-cyan hover:opacity-90 transition disabled:opacity-50"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exporting ? "Mengekspor..." : "Export PDF"}
            </button>
          </>
        }
      />

      <div className="glass-card rounded-2xl p-5">
        <div ref={reportRef} className="overflow-x-auto rounded-xl border border-border/60 bg-white p-4 text-[oklch(0.2_0.02_50)]">
          <div className="mb-4 text-center">
            <p className="text-sm font-bold uppercase tracking-wider">{title}</p>
            <p className="text-xs text-[oklch(0.4_0.05_50)]">{subtitle}</p>
          </div>
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-[oklch(0.95_0.02_240)] text-left text-[11px] uppercase tracking-wider text-[oklch(0.4_0.05_50)]">
                {columns.map((c, i) => (
                  <th
                    key={c}
                    className={
                      "px-4 py-3 font-medium " + (i === columns.length - 1 ? "text-right" : "")
                    }
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-t border-[oklch(0.9_0.02_240)]">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={
                        "px-4 py-3 " +
                        (ci === row.length - 1 ? "text-right font-medium" : "") +
                        (ci === 0 ? " font-mono text-[oklch(0.45_0.15_240)]" : "")
                      }
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
