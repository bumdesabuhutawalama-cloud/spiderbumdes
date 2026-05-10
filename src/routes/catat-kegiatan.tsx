import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, TrendingUp, Wallet, Loader2, X, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { DashboardLayout, PageHeader } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/catat-kegiatan")({
  head: () => ({ meta: [{ title: "Catat Kegiatan · BUMDes" }] }),
  component: CatatKegiatanPage,
});

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  entry_type: string;
  status: string;
};

const formatRp = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0,
  );

function CatatKegiatanPage() {
  const [openPenyertaan, setOpenPenyertaan] = useState(false);

  return (
    <DashboardLayout>
      <PageHeader
        title="Catat Kegiatan"
        subtitle="Pencatatan aktivitas operasional dan transaksi harian BUM Desa."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ActivityCard
          icon={<TrendingUp className="h-6 w-6" />}
          title="Penyertaan Modal"
          description="Pencatatan penambahan modal dari Desa atau Investor."
          onClick={() => setOpenPenyertaan(true)}
          accent="from-[var(--neon-cyan)] to-[var(--neon-green)]"
        />
        <ActivityCard
          icon={<Wallet className="h-6 w-6" />}
          title="Penerimaan Kas"
          description="Catat pemasukan kas dari operasional unit usaha."
          onClick={() => toast.info("Segera hadir")}
          accent="from-fuchsia-400 to-[var(--neon-cyan)]"
          comingSoon
        />
        <ActivityCard
          icon={<ClipboardList className="h-6 w-6" />}
          title="Pengeluaran Operasional"
          description="Catat pengeluaran operasional harian unit usaha."
          onClick={() => toast.info("Segera hadir")}
          accent="from-amber-400 to-rose-400"
          comingSoon
        />
      </div>

      {openPenyertaan && <PenyertaanModalDialog onClose={() => setOpenPenyertaan(false)} />}
    </DashboardLayout>
  );
}

function ActivityCard({
  icon,
  title,
  description,
  onClick,
  accent,
  comingSoon,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  accent: string;
  comingSoon?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="glass-card group relative rounded-2xl p-5 text-left transition hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(34,211,238,0.15)]"
    >
      <div className={`mb-3 inline-grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${accent} text-[oklch(0.15_0.03_250)]`}>
        {icon}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {comingSoon && (
        <span className="absolute top-3 right-3 rounded-full bg-secondary/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          segera
        </span>
      )}
    </button>
  );
}

function PenyertaanModalDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [tanggal, setTanggal] = useState(today);
  const [sumberModalId, setSumberModalId] = useState("");
  const [kasBankId, setKasBankId] = useState("");
  const [jumlah, setJumlah] = useState<string>("");
  const [keterangan, setKeterangan] = useState("");

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["coa_accounts_penyertaan"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coa_accounts")
        .select("*")
        .eq("status", "Aktif")
        .eq("entry_type", "Detail")
        .order("code")
        .limit(1000);
      if (error) throw error;
      return data as Account[];
    },
  });

  const modalAccounts = useMemo(
    () =>
      (accounts ?? []).filter(
        (a) => a.type === "EKUITAS" && /modal/i.test(a.name) && !/bagi hasil|ikhtisar|saldo/i.test(a.name),
      ),
    [accounts],
  );

  const kasBankAccounts = useMemo(
    () => (accounts ?? []).filter((a) => a.type === "ASET" && /(kas|bank)/i.test(a.name)),
    [accounts],
  );

  const sumberModal = modalAccounts.find((a) => a.id === sumberModalId);
  const kasBank = kasBankAccounts.find((a) => a.id === kasBankId);
  const nominal = Number(jumlah.replace(/[^\d]/g, "")) || 0;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!sumberModal || !kasBank) throw new Error("Pilih akun modal dan kas/bank");
      if (nominal <= 0) throw new Error("Jumlah modal harus lebih dari 0");

      const { data: je, error: jeErr } = await supabase
        .from("journal_entries")
        .insert({
          transaction_date: tanggal,
          transaction_type: "PENYERTAAN_MODAL",
          description: keterangan || `Penyertaan modal dari ${sumberModal.name}`,
          total_amount: nominal,
        })
        .select("id")
        .single();
      if (jeErr) throw jeErr;

      const { error: linesErr } = await supabase.from("journal_entry_lines").insert([
        {
          journal_entry_id: je.id,
          account_id: kasBank.id,
          account_code: kasBank.code,
          account_name: kasBank.name,
          debit: nominal,
          credit: 0,
          line_order: 1,
        },
        {
          journal_entry_id: je.id,
          account_id: sumberModal.id,
          account_code: sumberModal.code,
          account_name: sumberModal.name,
          debit: 0,
          credit: nominal,
          line_order: 2,
        },
      ]);
      if (linesErr) throw linesErr;
    },
    onSuccess: () => {
      toast.success("Transaksi penyertaan modal berhasil dicatat");
      qc.invalidateQueries({ queryKey: ["journal_entries"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="glass-card relative w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/10 p-6 shadow-[0_0_60px_rgba(34,211,238,0.25)] animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg bg-secondary/60 hover:bg-secondary transition"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-5">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-green)] text-[oklch(0.15_0.03_250)]">
              <TrendingUp className="h-4 w-4" />
            </span>
            Catat Penyertaan Modal
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Isi data berikut. Sistem akan otomatis menyiapkan pencatatan keuangan.
          </p>
        </div>

        {isLoading ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--neon-cyan)]" />
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Tanggal Transaksi">
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="input-glass"
              />
            </Field>

            <Field label="Sumber Modal">
              <select
                value={sumberModalId}
                onChange={(e) => setSumberModalId(e.target.value)}
                className="input-glass"
              >
                <option value="">Pilih akun modal</option>
                {modalAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Disimpan ke Rekening">
              <select
                value={kasBankId}
                onChange={(e) => setKasBankId(e.target.value)}
                className="input-glass"
              >
                <option value="">Pilih kas atau bank</option>
                {kasBankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Jumlah Modal">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  Rp
                </span>
                <input
                  inputMode="numeric"
                  value={jumlah ? Number(jumlah.replace(/[^\d]/g, "")).toLocaleString("id-ID") : ""}
                  onChange={(e) => setJumlah(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="0"
                  className="input-glass pl-9"
                />
              </div>
            </Field>

            <Field label="Keterangan">
              <textarea
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                rows={2}
                placeholder="Catatan tambahan (opsional)"
                className="input-glass resize-none"
              />
            </Field>

            {/* Preview */}
            <div className="mt-2 rounded-xl border border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan)]/5 p-4">
              <div className="text-xs uppercase tracking-wide text-[var(--neon-cyan)] mb-3">
                Preview Pencatatan Otomatis
              </div>
              <div className="space-y-2">
                <PreviewRow
                  icon={<ArrowDownCircle className="h-4 w-4 text-[var(--neon-green)]" />}
                  label="Dana Masuk"
                  account={kasBank ? `${kasBank.code} — ${kasBank.name}` : "—"}
                  amount={nominal}
                />
                <PreviewRow
                  icon={<ArrowUpCircle className="h-4 w-4 text-[var(--neon-cyan)]" />}
                  label="Sumber Dana"
                  account={sumberModal ? `${sumberModal.code} — ${sumberModal.name}` : "—"}
                  amount={nominal}
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-white/10 bg-secondary/40 px-4 py-2 text-sm hover:bg-secondary transition"
              >
                Batal
              </button>
              <button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || !sumberModalId || !kasBankId || nominal <= 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] px-5 py-2 text-sm font-medium text-[oklch(0.15_0.03_250)] glow-cyan hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan Transaksi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function PreviewRow({
  icon,
  label,
  account,
  amount,
}: {
  icon: React.ReactNode;
  label: string;
  account: string;
  amount: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-background/40 px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        {icon}
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-sm font-medium truncate">{account}</div>
        </div>
      </div>
      <div className="text-sm font-mono font-semibold tabular-nums text-[var(--neon-green)]">
        {formatRp(amount)}
      </div>
    </div>
  );
}
