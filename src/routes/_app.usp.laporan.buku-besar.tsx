import { createFileRoute, Link } from "@tanstack/react-router";
import { BukuBesarSheet } from "@/components/BukuBesarSheet";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/usp/laporan/buku-besar")({
  head: () => ({ meta: [{ title: "Buku Besar USP · BUMDes" }] }),
  component: BukuBesarUspPage,
});

function BukuBesarUspPage() {
  const { role } = useAuth();
  const unitId = role?.unitId ?? null;
  const unitName = role?.unitName ?? "Unit Simpan Pinjam";

  if (!unitId) {
    return (
      <div className="glass-card rounded-2xl p-6 text-sm text-muted-foreground">
        Akun Anda belum terhubung ke unit usaha. Hubungi admin pusat.{" "}
        <Link to="/usp" className="text-[var(--neon-cyan)] underline">
          Kembali
        </Link>
      </div>
    );
  }

  return (
    <BukuBesarSheet
      title={`Buku Besar ${unitName}`}
      subtitle="Mutasi akun khusus entity unit Anda. Data terfilter otomatis sesuai login."
      mode={{ unitId, unitName }}
    />
  );
}
