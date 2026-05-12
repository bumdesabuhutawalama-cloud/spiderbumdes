import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type DateFieldProps = {
  /** ISO date string (YYYY-MM-DD) */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export function DateField({
  value,
  onChange,
  placeholder = "Pilih tanggal",
  className,
  disabled,
}: DateFieldProps) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(() => {
    if (!value) return undefined;
    const d = parse(value, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : undefined;
  }, [value]);

  const label = selected
    ? format(selected, "EEEE, dd MMMM yyyy", { locale: localeId })
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "input-glass flex items-center justify-between gap-2 text-left",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate text-sm">{label}</span>
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto p-0 border border-white/10 bg-[oklch(0.18_0.03_250)]/95 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]"
      >
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (d) {
              onChange(format(d, "yyyy-MM-dd"));
              setOpen(false);
            }
          }}
          initialFocus
          locale={localeId}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
