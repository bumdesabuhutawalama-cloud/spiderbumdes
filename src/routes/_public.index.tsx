import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Banknote, ShieldCheck, BarChart3, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_public/")({
  head: () => ({
    meta: [
      { title: "BUMDes — Sistem akuntansi & transparansi unit usaha desa" },
      {
        name: "description",
        content:
          "Platform akuntansi multi-unit untuk Badan Usaha Milik Desa. Pencatatan otomatis, laporan konsolidasi, dan transparansi publik.",
      },
      { property: "og:title", content: "BUMDes — Sistem akuntansi unit usaha desa" },
      {
        property: "og:description",
        content: "Pencatatan otomatis dan laporan keuangan konsolidasi untuk BUMDes.",
      },
    ],
  }),
  component: HomePage,
});

const features = [
  {
    icon: Banknote,
    title: "Pencatatan otomatis",
    desc: "Cukup pilih jenis kegiatan. Jurnal akuntansi dibuat otomatis oleh sistem.",
  },
  {
    icon: BarChart3,
    title: "Laporan konsolidasi",
    desc: "Neraca, laba rugi, dan buku besar dari seluruh unit usaha dalam satu klik.",
  },
  {
    icon: ShieldCheck,
    title: "Transparansi publik",
    desc: "Ringkasan keuangan dapat diakses warga desa tanpa harus login.",
  },
];

function HomePage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
      <section className="grid gap-10 py-16 md:grid-cols-2 md:gap-12 md:py-24">
        <div className="flex flex-col justify-center">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--neon-cyan)]/40 bg-[var(--neon-cyan)]/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--neon-cyan)]">
            <Sparkles className="h-3.5 w-3.5" /> Akuntansi tanpa ribet
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            Kelola keuangan BUMDes <br />
            <span className="bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] bg-clip-text text-transparent">
              dengan mudah dan transparan.
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            Satu sistem untuk seluruh unit usaha desa. Catat kegiatan harian, sistem yang
            menyiapkan jurnal dan laporannya. Direktur dan warga bisa melihat hasilnya kapan saja.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/login"
              preload="intent"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] px-5 py-2.5 text-sm font-semibold text-[oklch(0.15_0.03_250)] transition hover:opacity-90"
            >
              Masuk dashboard <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/transparansi"
              preload="intent"
              className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/40 px-5 py-2.5 text-sm font-medium hover:border-[var(--neon-cyan)]/50"
            >
              Lihat transparansi
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="glass-card relative overflow-hidden rounded-2xl p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--neon-cyan)]/10 via-transparent to-[var(--neon-green)]/10" />
            <div className="relative space-y-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Aktivitas hari ini
              </p>
              {[
                { label: "Pencairan pinjaman USP", value: "Rp 12.500.000" },
                { label: "Penerimaan angsuran", value: "Rp 4.250.000" },
                { label: "Penjualan unit dagang", value: "Rp 1.870.000" },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-background/40 px-4 py-3"
                >
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className="text-sm font-semibold">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 pb-16 md:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="glass-card rounded-2xl p-6">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-green)] text-[oklch(0.15_0.03_250)]">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
