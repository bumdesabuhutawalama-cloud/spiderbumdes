import { createFileRoute } from "@tanstack/react-router";
import { FileText, Info } from "lucide-react";

export const Route = createFileRoute("/_public/transparansi")({
  head: () => ({
    meta: [
      { title: "Transparansi BUMDes — Laporan keuangan publik" },
      {
        name: "description",
        content:
          "Ringkasan laporan keuangan BUMDes yang dapat diakses oleh seluruh warga desa.",
      },
      { property: "og:title", content: "Transparansi BUMDes" },
      {
        property: "og:description",
        content: "Ringkasan laporan keuangan BUMDes untuk warga desa.",
      },
    ],
  }),
  component: TransparencyPage,
});

function TransparencyPage() {
  return (
    <div className="mx-auto max-w-[1000px] px-4 py-14 sm:px-6 md:py-20">
      <h1 className="font-display text-3xl font-bold md:text-4xl">Transparansi</h1>
      <p className="mt-4 max-w-2xl text-base text-muted-foreground">
        Halaman ini menampilkan ringkasan kondisi keuangan BUMDes untuk warga desa. Detail laporan
        diaudit dan dipublikasikan secara berkala.
      </p>

      <div className="mt-8 flex items-start gap-3 rounded-xl border border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan)]/5 px-4 py-3 text-sm text-[var(--neon-cyan)]">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Ringkasan publik akan diperbarui setiap akhir periode. Untuk akses laporan rinci, silakan
          hubungi pengurus BUMDes.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {[
          { title: "Laporan tahunan", desc: "Ringkasan neraca dan laba rugi konsolidasi tahunan." },
          { title: "Laporan triwulan", desc: "Update progres unit usaha setiap tiga bulan." },
          { title: "Pembagian hasil usaha", desc: "Distribusi keuntungan kepada desa dan warga." },
          { title: "Audit independen", desc: "Hasil audit pihak ketiga untuk akuntabilitas." },
        ].map((item) => (
          <div key={item.title} className="glass-card flex items-start gap-4 rounded-2xl p-5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary/60 text-[var(--neon-cyan)]">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
              <p className="mt-2 text-xs text-muted-foreground/70">Segera tersedia.</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
