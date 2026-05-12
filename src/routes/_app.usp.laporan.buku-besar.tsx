import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BukuBesarSheet } from "@/components/BukuBesarSheet";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/usp/laporan/buku-besar")({
  head: () => ({ meta: [{ title: "Buku Besar USP · BUMDes" }] }),
  component: BukuBesarUspPage,
});

function BukuBesarUspPage() {
  const { role, isPusat } = useAuth();

  // Pusat melihat /usp → cari unit dengan code USP.
  const { data: uspUnit } = useQuery({
    queryKey: ["unit-usp"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id,name,code")
        .eq("code", "USP")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isPusat,
  });

  const unitId = isPusat ? uspUnit?.id ?? null : role?.unitId ?? null;
  const unitName = isPusat ? uspUnit?.name ?? "Unit Simpan Pinjam" : role?.unitName ?? "Unit Simpan Pinjam";

  if (!unitId) {
    return (
      <div className="glass-card rounded-2xl p-6 text-sm text-muted-foreground">
        Unit usaha belum dikonfigurasi. <Link to="/usp" className="text-[var(--neon-cyan)] underline">Kembali</Link>
      </div>
    );
  }

  return (
    <BukuBesarSheet
      title={`Buku Besar ${unitName}`}
      subtitle="Mutasi akun khusus entity unit ini. Data terfilter otomatis berdasarkan kepemilikan akun."
      mode={{ unitId, unitName }}
    />
  );
}
