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
      <h1 className="font-display text-3xl font-bold text-brand md:text-4xl">Kontak</h1>
      <p className="mt-4 max-w-2xl text-[15px] text-brand-muted">
        Punya pertanyaan, saran, atau ingin menjalin kerja sama? Hubungi pengurus BUMDes melalui
        kanal di bawah.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {[
          { icon: MapPin, title: "Alamat", value: "Kantor desa, sesuai domisili BUMDes" },
          { icon: Mail, title: "Email", value: "halo@bumdes.desa.id" },
          { icon: Phone, title: "Telepon", value: "(0000) 000-0000" },
        ].map((c) => (
          <div key={c.title} className="info-card flex items-start gap-4">
            <div className="icon-badge">
              <c.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="info-card__title">{c.title}</h3>
              <p className="info-card__desc mt-1.5">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <form
        className="form-card mt-10 grid gap-4"
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
          <input name="name" required placeholder="Nama Anda" className="input-soft" />
          <input name="email" type="email" required placeholder="Email" className="input-soft" />
        </div>
        <textarea
          name="message"
          required
          rows={5}
          placeholder="Pesan Anda"
          className="input-soft"
        />
        <button type="submit" className="btn-brand w-fit">
          Kirim pesan
        </button>
      </form>
    </div>
  );
}
