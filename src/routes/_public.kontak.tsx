import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";

export const Route = createFileRoute("/_public/kontak")({
  head: () => ({
    meta: [
      { title: "Kontak BUMDes — Hubungi pengurus" },
      {
        name: "description",
        content: "Informasi kontak pengurus BUMDes untuk pertanyaan, saran, dan kerja sama.",
      },
      { property: "og:title", content: "Kontak BUMDes" },
      { property: "og:description", content: "Hubungi pengurus BUMDes." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="mx-auto max-w-[1000px] px-4 py-14 sm:px-6 md:py-20">
      <h1 className="font-display text-3xl font-bold md:text-4xl">Kontak</h1>
      <p className="mt-4 max-w-2xl text-base text-muted-foreground">
        Punya pertanyaan, saran, atau ingin menjalin kerja sama? Hubungi pengurus BUMDes melalui
        kanal di bawah.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          { icon: MapPin, title: "Alamat", value: "Kantor desa, sesuai domisili BUMDes" },
          { icon: Mail, title: "Email", value: "halo@bumdes.desa.id" },
          { icon: Phone, title: "Telepon", value: "(0000) 000-0000" },
        ].map((c) => (
          <div key={c.title} className="glass-card rounded-2xl p-6">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-green)] text-[oklch(0.15_0.03_250)]">
              <c.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold">{c.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{c.value}</p>
          </div>
        ))}
      </div>

      <form
        className="glass-card mt-8 grid gap-4 rounded-2xl p-6"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget as HTMLFormElement;
          const data = new FormData(form);
          const subject = encodeURIComponent(`Kontak dari ${String(data.get("name") ?? "")}`);
          const body = encodeURIComponent(String(data.get("message") ?? ""));
          window.location.href = `mailto:halo@bumdes.desa.id?subject=${subject}&body=${body}`;
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="name"
            required
            placeholder="Nama Anda"
            className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:border-[var(--neon-cyan)]/60"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:border-[var(--neon-cyan)]/60"
          />
        </div>
        <textarea
          name="message"
          required
          rows={5}
          placeholder="Pesan Anda"
          className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:border-[var(--neon-cyan)]/60"
        />
        <button
          type="submit"
          className="w-fit rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] px-5 py-2.5 text-sm font-semibold text-[oklch(0.15_0.03_250)] transition hover:opacity-90"
        >
          Kirim pesan
        </button>
      </form>
    </div>
  );
}
