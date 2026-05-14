import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BukuBesarSheet } from "@/components/BukuBesarSheet";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/dagang/laporan/buku-besar")({
  head: () => ({ meta: [{ title: "Buku Besar Dagang · BUMDes" }] }),
  component: BukuBesarDagangPage,
});

function BukuBesarDagangPage() {
  const { role, isPusat } = useAuth();

  const { data: dagangUnit } = useQuery({
    queryKey: ["unit-dagang"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id,name,code")
        .eq("code", "DAGANG")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isPusat,
  });

  const unitId = isPusat ? dagangUnit?.id ?? null : role?.unitId ?? null;
  const unitName = isPusat ? dagangUnit?.name ?? "Unit Perdagangan" : role?.unitName ?? "Unit Perdagangan";

  if (!unitId) {
    return (
      <div className="glass-card rounded-2xl p-6 text-sm text-muted-foreground">
        Unit usaha belum dikonfigurasi.{" "}
        <Link to="/dagang" className="text-[var(--neon-cyan)] underline">Kembali</Link>
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
