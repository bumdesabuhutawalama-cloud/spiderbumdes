import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Banknote,
  ShieldCheck,
  BarChart3,
  Sparkles,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

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
      {/* HERO */}
      <section className="grid gap-12 py-16 md:grid-cols-2 md:gap-12 md:py-24">
        <div className="flex flex-col justify-center">
          <span
            className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.18em]"
            style={{
              background: "var(--blue-50)",
              color: "var(--blue-500)",
              border: "1px solid rgba(47,111,237,0.18)",
            }}
          >
            <Sparkles className="h-3.5 w-3.5" /> Akuntansi tanpa ribet
          </span>

          <h1 className="mt-5 font-display font-bold leading-[1.1] tracking-tight md:text-5xl lg:text-[56px] text-center border-double text-2xl">
            Kelola keuangan BUMDes
            <br />
            <span
              style={{
                background: "var(--grad-navy)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              dengan mudah & transparan.
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base text-brand-muted md:text-lg">
            Satu sistem untuk seluruh unit usaha desa. Catat kegiatan harian — sistem yang
            menyiapkan jurnal dan laporannya. Direktur dan warga bisa melihat hasilnya kapan saja.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/login" preload="intent" className="btn-primary">
              Masuk dashboard <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/transparansi" preload="intent" className="btn-outline">
              Lihat transparansi
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-brand-muted">
            {["Multi-unit usaha", "Konsolidasi otomatis", "Aman & terenkripsi"].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" style={{ color: "var(--blue-500)" }} />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* HERO MOCK CARD */}
        <div className="relative">
          <div
            className="absolute -inset-6 rounded-3xl opacity-60 blur-2xl"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, rgba(47,111,237,0.25), transparent 70%)",
            }}
          />
          <div className="surface-card relative overflow-hidden p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-brand-muted">
                  Aktivitas hari ini
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-brand">
                  Rp 18.620.000
                </p>
              </div>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{
                  background: "rgba(34,197,94,0.10)",
                  color: "rgb(21,128,61)",
                }}
              >
                <TrendingUp className="h-3.5 w-3.5" /> +12,4%
              </span>
            </div>

            <div className="mt-5 space-y-2.5">
              {[
                { label: "Pencairan pinjaman USP", value: "Rp 12.500.000" },
                { label: "Penerimaan angsuran", value: "Rp 4.250.000" },
                { label: "Penjualan unit dagang", value: "Rp 1.870.000" },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-soft)",
                  }}
                >
                  <span className="text-sm text-brand-muted">{row.label}</span>
                  <span className="text-sm font-semibold text-brand">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="grid gap-5 pb-16 md:grid-cols-3 md:pb-24">
        {features.map((f) => (
          <div key={f.title} className="surface-card p-6">
            <div className="icon-badge">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-5 text-base font-semibold text-brand">{f.title}</h3>
            <p className="mt-1.5 text-sm text-brand-muted leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="pb-20">
        <div
          className="relative overflow-hidden rounded-3xl px-6 py-12 text-center sm:px-12"
          style={{ background: "var(--grad-navy)", boxShadow: "var(--shadow-lg)" }}
        >
          <div
            aria-hidden
            className="absolute inset-0 opacity-30"
            style={{
              background:
                "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.25), transparent 60%)",
            }}
          />
          <div className="relative">
            <h2 className="font-display text-2xl font-bold text-white md:text-3xl">
              Siap mengelola keuangan desa lebih profesional?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/80 md:text-base">
              Akses dashboard direktur atau dashboard unit usaha untuk mulai mencatat kegiatan
              harian secara otomatis.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/login"
                preload="intent"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[var(--navy-800)] transition hover:bg-blue-50"
              >
                Masuk dashboard <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/transparansi"
                preload="intent"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Lihat laporan publik
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
