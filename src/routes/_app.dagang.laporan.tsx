import { createFileRoute, Link } from "@tanstack/react-router";
import { Scale, FileBarChart, BookOpen, GitCompare } from "lucide-react";
import { PageHeader } from "@/components/DashboardLayout";

export const Route = createFileRoute("/_app/dagang/laporan")({
  head: () => ({ meta: [{ title: "Laporan Dagang · BUMDes" }] }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Laporan Perdagangan" subtitle="Laporan keuangan unit perdagangan." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card to="/laporan/neraca-konsolidasi" title="Neraca" desc="Posisi keuangan konsolidasi." icon={<Scale className="h-5 w-5" />} />
        <Card to="/laporan/laba-rugi" title="Laba Rugi" desc="Pendapatan, HPP, beban, dan laba bersih." icon={<FileBarChart className="h-5 w-5" />} />
        <Card to="/laporan/buku-besar-konsolidasi" title="Buku Besar" desc="Mutasi seluruh akun." icon={<BookOpen className="h-5 w-5" />} />
        <Card to="/laporan/rekonsiliasi-rk" title="Rekonsiliasi RK" desc="Cek rekening koran antar unit." icon={<GitCompare className="h-5 w-5" />} />
      </div>
    </>
  );
}

function Card({ to, title, desc, icon }: { to: string; title: string; desc: string; icon: React.ReactNode }) {
  return (
    <Link
      to={to as "/laporan/neraca-konsolidasi"}
      className="glass-card group rounded-2xl p-5 transition hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(34,211,238,0.15)]"
    >
      <div className="mb-3 inline-grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-green)] text-[oklch(0.15_0.03_250)]">
        {icon}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </Link>
  );
}
