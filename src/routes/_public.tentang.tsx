import { createFileRoute } from "@tanstack/react-router";
import { Target, Eye, Users } from "lucide-react";

export const Route = createFileRoute("/_public/tentang")({
  head: () => ({
    meta: [
      { title: "Tentang BUMDes — Profil & visi misi" },
      {
        name: "description",
        content:
          "Profil Badan Usaha Milik Desa: visi, misi, dan struktur organisasi unit usaha desa.",
      },
      { property: "og:title", content: "Tentang BUMDes" },
      {
        property: "og:description",
        content: "Profil dan visi misi Badan Usaha Milik Desa.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="mx-auto max-w-[1000px] px-4 py-14 sm:px-6 md:py-20">
      <h1 className="font-display text-3xl font-bold md:text-4xl">Tentang BUMDes</h1>
      <p className="mt-4 max-w-2xl text-base text-muted-foreground">
        Badan Usaha Milik Desa (BUMDes) adalah lembaga ekonomi yang dibentuk dan dikelola oleh
        masyarakat desa untuk meningkatkan kesejahteraan warga melalui unit-unit usaha produktif.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          {
            icon: Target,
            title: "Visi",
            desc: "Menjadi penggerak ekonomi desa yang mandiri, transparan, dan berkelanjutan.",
          },
          {
            icon: Eye,
            title: "Misi",
            desc: "Mengelola unit usaha secara profesional dan akuntabel untuk kemakmuran warga.",
          },
          {
            icon: Users,
            title: "Tata kelola",
            desc: "Direktur pusat membawahi admin unit. Setiap transaksi tercatat otomatis.",
          },
        ].map((item) => (
          <div key={item.title} className="glass-card rounded-2xl p-6">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-green)] text-[oklch(0.15_0.03_250)]">
              <item.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
