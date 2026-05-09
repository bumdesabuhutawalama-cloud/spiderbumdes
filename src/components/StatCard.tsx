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
  const isCyan = accent === "cyan";
  return (
    <div
      className={cn(
        "glass-card group relative overflow-hidden rounded-2xl p-5 transition-transform hover:-translate-y-0.5",
        isCyan ? "hover:glow-cyan" : "hover:glow-green",
      )}
    >
      <div
        className={cn(
          "absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl opacity-30 transition-opacity group-hover:opacity-60",
          isCyan ? "bg-[var(--neon-cyan)]" : "bg-[var(--neon-green)]",
        )}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          <p
            className={cn(
              "mt-2 text-2xl md:text-[28px] font-semibold",
              isCyan ? "text-glow-cyan" : "text-glow-green",
            )}
          >
            {value}
          </p>
          {delta && (
            <p className="mt-1 text-xs text-muted-foreground">
              <span
                className={cn(
                  "font-medium",
                  isCyan ? "text-[var(--neon-cyan)]" : "text-[var(--neon-green)]",
                )}
              >
                {delta}
              </span>{" "}
              vs bulan lalu
            </p>
          )}
        </div>
        <div
          className={cn(
            "grid h-10 w-10 place-items-center rounded-xl border border-border/60 bg-background/50",
            isCyan ? "text-[var(--neon-cyan)]" : "text-[var(--neon-green)]",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
