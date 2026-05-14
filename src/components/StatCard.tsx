import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  accent = "cyan",
}: {
  label: string;
  value: string;
  delta?: string;
  icon: LucideIcon;
  accent?: "cyan" | "green";
}) {
  const isPositive = !delta || !delta.trim().startsWith("-");
  return (
    <div className={cn("surface-card group relative overflow-hidden p-5")}>
      <div
        className="absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-30 blur-2xl transition-opacity group-hover:opacity-60"
        style={{
          background:
            accent === "cyan"
              ? "var(--blue-300)"
              : "var(--navy-700)",
        }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-brand-muted">
            {label}
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-brand md:text-[26px] truncate">
            {value}
          </p>
          {delta && (
            <p className="mt-1 text-xs text-brand-muted">
              <span
                className="font-semibold"
                style={{ color: isPositive ? "rgb(21,128,61)" : "rgb(190,18,60)" }}
              >
                {delta}
              </span>{" "}
              vs bulan lalu
            </p>
          )}
        </div>
        <div className="icon-badge-navy">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
