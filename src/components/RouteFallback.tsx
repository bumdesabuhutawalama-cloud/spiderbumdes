import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic skeleton ditampilkan instan saat berpindah route.
 * Mengisi area konten utama agar halaman lama tidak terlihat tertinggal.
 */
export function RouteFallback() {
  return (
    <div className="space-y-5 animate-pulse-fast">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[420px] rounded-2xl" />
    </div>
  );
}
