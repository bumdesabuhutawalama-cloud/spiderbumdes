import { Calendar, Download } from "lucide-react";
import { DashboardLayout, PageHeader } from "@/components/DashboardLayout";

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
  return (
    <DashboardLayout>
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
            <button className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] px-4 py-2 text-sm font-medium text-[oklch(0.15_0.03_250)] glow-cyan hover:opacity-90 transition">
              <Download className="h-4 w-4" />
              Export
            </button>
          </>
        }
      />

      <div className="glass-card rounded-2xl p-5">
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-background/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
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
                <tr
                  key={ri}
                  className="border-t border-border/60 transition hover:bg-secondary/30"
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={
                        "px-4 py-3 " +
                        (ci === row.length - 1 ? "text-right font-medium" : "") +
                        (ci === 0 ? " font-mono text-[var(--neon-cyan)]" : "")
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
    </DashboardLayout>
  );
}
