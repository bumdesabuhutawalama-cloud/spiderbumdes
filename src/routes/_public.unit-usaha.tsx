import { createFileRoute } from "@tanstack/react-router";
import { Coins, Store, Wheat, Wrench } from "lucide-react";

export const Route = createFileRoute("/_public/unit-usaha")({
  head: () => ({
    meta: [
      { title: "Unit usaha BUMDes — Layanan ekonomi desa" },
      {
        name: "description",
        content:
          "Daftar unit usaha BUMDes: simpan pinjam, perdagangan, pertanian, dan layanan lainnya.",
      },
      { property: "og:title", content: "Unit usaha BUMDes" },
      {
        property: "og:description",
        content: "Layanan ekonomi yang dikelola unit-unit usaha BUMDes.",
      },
    ],
  }),
  component: UnitsPage,
});

const units = [
  {
    icon: Coins,
    name: "Unit simpan pinjam (USP)",
    desc: "Layanan keuangan mikro: pencairan pinjaman, angsuran, dan simpanan warga.",
  },
  {
    icon: Store,
    name: "Unit perdagangan",
    desc: "Toko desa yang menyediakan kebutuhan harian dengan harga terjangkau.",
  },
  {
    icon: Wheat,
    name: "Unit pertanian",
    desc: "Pendampingan dan pemasaran hasil tani untuk petani desa.",
  },
  {
    icon: Wrench,
    name: "Unit jasa",
    desc: "Layanan jasa pendukung kegiatan ekonomi dan kebutuhan warga.",
  },
];

function UnitsPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-14 sm:px-6 md:py-20">
      <h1 className="font-display text-3xl font-bold md:text-4xl">Unit usaha</h1>
      <p className="mt-4 max-w-2xl text-base text-muted-foreground">
        Setiap unit usaha dikelola admin tersendiri dan terhubung ke laporan konsolidasi pusat.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {units.map((u) => (
          <div key={u.name} className="glass-card rounded-2xl p-6">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-green)] text-[oklch(0.15_0.03_250)]">
              <u.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{u.name}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{u.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
