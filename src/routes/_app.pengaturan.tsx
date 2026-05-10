import { createFileRoute } from "@tanstack/react-router";
import { Upload, Save, Building2 } from "lucide-react";
import { DashboardLayout, PageHeader } from "@/components/DashboardLayout";

export const Route = createFileRoute("/_app/pengaturan")({
  head: () => ({ meta: [{ title: "Pengaturan · BUMDes" }] }),
  component: PengaturanPage,
});

function PengaturanPage() {
  return (
    <DashboardLayout>
      <PageHeader
        title="Pengaturan BUMDes"
        subtitle="Konfigurasi identitas dan struktur organisasi."
      />

      <form
        onSubmit={(e) => e.preventDefault()}
        className="glass-card rounded-2xl p-6 md:p-8 max-w-3xl space-y-6"
      >
        <Field label="Nama BUMDes">
          <input
            type="text"
            defaultValue="BUMDes Sumber Makmur"
            className="w-full rounded-lg border border-border/60 bg-background/40 px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--neon-cyan)]/60 focus:ring-2 focus:ring-[var(--neon-cyan)]/20"
          />
        </Field>

        <Field label="Upload Logo">
          <label className="group flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-border/80 bg-background/40 p-4 transition hover:border-[var(--neon-cyan)]/50">
            <div className="grid h-14 w-14 place-items-center rounded-lg bg-gradient-to-br from-[var(--neon-cyan)]/20 to-[var(--neon-green)]/20 text-[var(--neon-cyan)]">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Klik untuk unggah logo</p>
              <p className="text-xs text-muted-foreground">PNG, JPG, SVG · maks. 2MB</p>
            </div>
            <Upload className="h-5 w-5 text-muted-foreground transition group-hover:text-[var(--neon-cyan)]" />
            <input type="file" className="hidden" accept="image/*" />
          </label>
        </Field>

        <Field label="Struktur BUMDes">
          <textarea
            rows={6}
            defaultValue={`Direktur: Admin Pusat\nSekretaris: —\nBendahara: —\nKepala Unit Air Bersih: —\nKepala Unit Pasar Desa: —`}
            className="w-full resize-y rounded-lg border border-border/60 bg-background/40 px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--neon-cyan)]/60 focus:ring-2 focus:ring-[var(--neon-cyan)]/20"
          />
        </Field>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] px-5 py-2.5 text-sm font-semibold text-[oklch(0.15_0.03_250)] glow-cyan transition hover:opacity-90"
          >
            <Save className="h-4 w-4" />
            Simpan Pengaturan
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
