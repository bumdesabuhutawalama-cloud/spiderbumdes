import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, TrendingUp, Wallet, Loader2, X, ArrowDownCircle, ArrowUpCircle, Package, HandCoins, Banknote, AlertTriangle, Receipt } from "lucide-react";
import { PageHeader } from "@/components/DashboardLayout";
import { DateField } from "@/components/DateField";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  PencairanPinjamanDialog,
  TerimaAngsuranDialog,
  TerimaDendaDialog,
  BebanOperasionalUspDialog,
} from "@/components/usp-dialogs";

export const Route = createFileRoute("/_app/usp/kegiatan")({
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
  const [openBelanjaAset, setOpenBelanjaAset] = useState(false);
  const [openPenerimaan, setOpenPenerimaan] = useState(false);
  const [openPengeluaran, setOpenPengeluaran] = useState(false);
  const [openPencairan, setOpenPencairan] = useState(false);
  const [openAngsuran, setOpenAngsuran] = useState(false);
  const [openDenda, setOpenDenda] = useState(false);
  const [openBebanUsp, setOpenBebanUsp] = useState(false);

  return (
    <>
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
          icon={<Package className="h-6 w-6" />}
          title="Belanja Aset / Modal"
          description="Pembelian aset tetap atau belanja modal unit usaha."
          onClick={() => setOpenBelanjaAset(true)}
          accent="from-[var(--neon-green)] to-amber-300"
        />
        <ActivityCard
          icon={<Wallet className="h-6 w-6" />}
          title="Penerimaan Kas"
          description="Catat pemasukan kas dari operasional unit usaha."
          onClick={() => setOpenPenerimaan(true)}
          accent="from-fuchsia-400 to-[var(--neon-cyan)]"
        />
        <ActivityCard
          icon={<ClipboardList className="h-6 w-6" />}
          title="Pengeluaran Operasional"
          description="Catat pengeluaran operasional harian unit usaha."
          onClick={() => setOpenPengeluaran(true)}
          accent="from-amber-400 to-rose-400"
        />
        <ActivityCard
          icon={<HandCoins className="h-6 w-6" />}
          title="Pencairan Pinjaman (USP)"
          description="Cairkan pinjaman ke peminjam, jadwal angsuran otomatis."
          onClick={() => setOpenPencairan(true)}
          accent="from-emerald-400 to-[var(--neon-cyan)]"
        />
        <ActivityCard
          icon={<Banknote className="h-6 w-6" />}
          title="Terima Angsuran (USP)"
          description="Catat penerimaan angsuran pokok & bunga pinjaman."
          onClick={() => setOpenAngsuran(true)}
          accent="from-[var(--neon-cyan)] to-sky-400"
        />
        <ActivityCard
          icon={<AlertTriangle className="h-6 w-6" />}
          title="Terima Denda (USP)"
          description="Catat penerimaan denda keterlambatan angsuran."
          onClick={() => setOpenDenda(true)}
          accent="from-rose-400 to-amber-300"
        />
        <ActivityCard
          icon={<Receipt className="h-6 w-6" />}
          title="Beban Operasional (USP)"
          description="Catat beban operasional Unit Simpan Pinjam."
          onClick={() => setOpenBebanUsp(true)}
          accent="from-violet-400 to-fuchsia-400"
        />
      </div>

      {openPenyertaan && <PenyertaanModalDialog onClose={() => setOpenPenyertaan(false)} />}
      {openBelanjaAset && <BelanjaAsetDialog onClose={() => setOpenBelanjaAset(false)} />}
      {openPenerimaan && <PenerimaanKasDialog onClose={() => setOpenPenerimaan(false)} />}
      {openPengeluaran && <PengeluaranOperasionalDialog onClose={() => setOpenPengeluaran(false)} />}
      {openPencairan && <PencairanPinjamanDialog onClose={() => setOpenPencairan(false)} />}
      {openAngsuran && <TerimaAngsuranDialog onClose={() => setOpenAngsuran(false)} />}
      {openDenda && <TerimaDendaDialog onClose={() => setOpenDenda(false)} />}
      {openBebanUsp && <BebanOperasionalUspDialog onClose={() => setOpenBebanUsp(false)} />}
    </>
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

  const sumberRef = useRef<HTMLSelectElement>(null);
  const kasRef = useRef<HTMLSelectElement>(null);
  const jumlahRef = useRef<HTMLInputElement>(null);
  const keteranganRef = useRef<HTMLTextAreaElement>(null);

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
        (a) =>
          a.type === "EKUITAS" &&
          a.code.startsWith("3.1.") &&
          !/bagi hasil|ikhtisar|saldo|donasi/i.test(a.name),
      ),
    [accounts],
  );

  const kasBankAccounts = useMemo(
    () =>
      (accounts ?? []).filter(
        (a) => a.type === "ASET" && (a.code.startsWith("1.1.01.") || a.code.startsWith("1.1.02.")),
      ),
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
      qc.invalidateQueries({ queryKey: ["balances"] });
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
        className="glass-card relative w-full sm:max-w-3xl max-h-[96vh] overflow-hidden rounded-t-2xl sm:rounded-2xl border border-white/10 p-4 sm:p-5 shadow-[0_0_60px_rgba(34,211,238,0.25)] animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg bg-secondary/60 hover:bg-secondary transition"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-3">
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-green)] text-[oklch(0.15_0.03_250)]">
              <TrendingUp className="h-4 w-4" />
            </span>
            Catat Penyertaan Modal
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Isi data berikut. Sistem akan otomatis menyiapkan pencatatan keuangan.
          </p>
        </div>

        {isLoading ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--neon-cyan)]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Field label="Tanggal Transaksi">
              <DateField
                value={tanggal}
                onChange={(v) => {
                  setTanggal(v);
                  if (v) sumberRef.current?.focus();
                }}
              />
            </Field>

            <Field label="Sumber Modal">
              <select
                ref={sumberRef}
                value={sumberModalId}
                onChange={(e) => {
                  setSumberModalId(e.target.value);
                  if (e.target.value) kasRef.current?.focus();
                }}
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
                ref={kasRef}
                value={kasBankId}
                onChange={(e) => {
                  setKasBankId(e.target.value);
                  if (e.target.value) jumlahRef.current?.focus();
                }}
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
                  ref={jumlahRef}
                  inputMode="numeric"
                  value={jumlah ? Number(jumlah.replace(/[^\d]/g, "")).toLocaleString("id-ID") : ""}
                  onChange={(e) => setJumlah(e.target.value.replace(/[^\d]/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      keteranganRef.current?.focus();
                    }
                  }}
                  placeholder="0"
                  className="input-glass pl-9"
                />
              </div>
            </Field>

            <div className="sm:col-span-2">
              <Field label="Keterangan">
                <textarea
                  ref={keteranganRef}
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  rows={2}
                  placeholder="Catatan tambahan (opsional)"
                  className="input-glass resize-none"
                />
              </Field>
            </div>

            {/* Preview */}
            <div className="sm:col-span-2 rounded-xl border border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan)]/5 p-2.5">
              <div className="text-[10px] uppercase tracking-wide text-[var(--neon-cyan)] mb-1.5">
                Preview Pencatatan Otomatis
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

            <div className="sm:col-span-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
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

type AsetCategory = {
  key: string;
  label: string;
  prefix: string; // prefix kode akun aset di COA
  hint: string;
};

const ASET_CATEGORIES: AsetCategory[] = [
  { key: "tanah", label: "Tanah", prefix: "1.3.01.", hint: "Pembelian tanah" },
  { key: "kendaraan", label: "Kendaraan", prefix: "1.3.02.", hint: "Mobil, motor operasional" },
  { key: "peralatan", label: "Peralatan & Mesin", prefix: "1.3.03.", hint: "Mesin, alat produksi" },
  { key: "meubelair", label: "Meubelair", prefix: "1.3.04.", hint: "Furnitur kantor" },
  { key: "bangunan", label: "Gedung & Bangunan", prefix: "1.3.05.", hint: "Pembangunan gedung" },
  { key: "konstruksi", label: "Konstruksi Berjalan", prefix: "1.3.06.", hint: "Pekerjaan belum selesai" },
  { key: "investasi", label: "Investasi / Deposito", prefix: "1.2.01.", hint: "Investasi jangka panjang" },
  { key: "lainnya", label: "Aset Lainnya", prefix: "1.3.99.", hint: "Aset tetap lainnya" },
];

function BelanjaAsetDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [tanggal, setTanggal] = useState(today);
  const [categoryKey, setCategoryKey] = useState<string>("");
  const [kasBankId, setKasBankId] = useState("");
  const [jumlah, setJumlah] = useState<string>("");
  const [keterangan, setKeterangan] = useState("");

  const jumlahRef = useRef<HTMLInputElement>(null);
  const keteranganRef = useRef<HTMLTextAreaElement>(null);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["coa_accounts_belanja_aset"],
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

  const kasBankAccounts = useMemo(
    () =>
      (accounts ?? []).filter(
        (a) => a.type === "ASET" && (a.code.startsWith("1.1.01.") || a.code.startsWith("1.1.02.")),
      ),
    [accounts],
  );

  // Auto-default kas/bank ke "Kas Tunai" jika belum dipilih
  if (!kasBankId && kasBankAccounts.length > 0) {
    const def = kasBankAccounts.find((a) => /kas tunai/i.test(a.name)) ?? kasBankAccounts[0];
    queueMicrotask(() => setKasBankId(def.id));
  }

  const category = ASET_CATEGORIES.find((c) => c.key === categoryKey);
  // Auto-pasang akun aset detail berdasarkan prefix kode kategori.
  const aset = useMemo(() => {
    if (!category || !accounts) return undefined;
    const candidates = accounts.filter(
      (a) =>
        a.type === "ASET" &&
        a.code.startsWith(category.prefix) &&
        !/akumulasi|penyusutan/i.test(a.name),
    );
    return candidates[0];
  }, [category, accounts]);

  const kasBank = kasBankAccounts.find((a) => a.id === kasBankId);
  const nominal = Number(jumlah.replace(/[^\d]/g, "")) || 0;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!aset || !kasBank) throw new Error("Pilih akun aset dan sumber kas/bank");
      if (nominal <= 0) throw new Error("Jumlah belanja harus lebih dari 0");

      const { data: je, error: jeErr } = await supabase
        .from("journal_entries")
        .insert({
          transaction_date: tanggal,
          transaction_type: "BELANJA_ASET",
          description: keterangan || `Belanja aset ${aset.name}`,
          total_amount: nominal,
        })
        .select("id")
        .single();
      if (jeErr) throw jeErr;

      const { error: linesErr } = await supabase.from("journal_entry_lines").insert([
        {
          journal_entry_id: je.id,
          account_id: aset.id,
          account_code: aset.code,
          account_name: aset.name,
          debit: nominal,
          credit: 0,
          line_order: 1,
        },
        {
          journal_entry_id: je.id,
          account_id: kasBank.id,
          account_code: kasBank.code,
          account_name: kasBank.name,
          debit: 0,
          credit: nominal,
          line_order: 2,
        },
      ]);
      if (linesErr) throw linesErr;
    },
    onSuccess: () => {
      toast.success("Belanja aset/modal berhasil dicatat");
      qc.invalidateQueries({ queryKey: ["journal_entries"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
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
        className="glass-card relative w-full sm:max-w-3xl max-h-[96vh] overflow-hidden rounded-t-2xl sm:rounded-2xl border border-white/10 p-4 sm:p-5 shadow-[0_0_60px_rgba(34,211,238,0.25)] animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg bg-secondary/60 hover:bg-secondary transition"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-3">
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[var(--neon-green)] to-amber-300 text-[oklch(0.15_0.03_250)]">
              <Package className="h-4 w-4" />
            </span>
            Catat Belanja Aset / Modal
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pembelian aset tetap atau belanja modal. Sistem akan otomatis menyiapkan jurnal.
          </p>
        </div>

        {isLoading ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--neon-cyan)]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Field label="Tanggal Transaksi">
              <DateField value={tanggal} onChange={setTanggal} />
            </Field>

            <Field label="Sumber Pembayaran">
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

            <div className="sm:col-span-2">
              <Field label="Jenis Aset / Belanja Modal">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ASET_CATEGORIES.map((c) => {
                    const active = c.key === categoryKey;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => {
                          setCategoryKey(c.key);
                          queueMicrotask(() => jumlahRef.current?.focus());
                        }}
                        className={
                          "rounded-lg border px-2.5 py-2 text-left transition " +
                          (active
                            ? "border-[var(--neon-green)] bg-[var(--neon-green)]/10 shadow-[0_0_15px_rgba(74,222,128,0.25)]"
                            : "border-white/10 bg-secondary/40 hover:border-white/20 hover:bg-secondary/60")
                        }
                      >
                        <div className="text-xs font-semibold leading-tight">{c.label}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{c.hint}</div>
                      </button>
                    );
                  })}
                </div>
                {category && !aset && (
                  <p className="mt-1 text-[11px] text-amber-400">
                    Akun untuk kategori ini belum tersedia di COA (prefix {category.prefix}).
                  </p>
                )}
                {aset && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Akun otomatis: <span className="text-foreground font-medium">{aset.code} — {aset.name}</span>
                  </p>
                )}
              </Field>
            </div>

            <Field label="Jumlah Belanja">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  Rp
                </span>
                <input
                  ref={jumlahRef}
                  inputMode="numeric"
                  value={jumlah ? Number(jumlah.replace(/[^\d]/g, "")).toLocaleString("id-ID") : ""}
                  onChange={(e) => setJumlah(e.target.value.replace(/[^\d]/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      keteranganRef.current?.focus();
                    }
                  }}
                  placeholder="0"
                  className="input-glass pl-9"
                />
              </div>
            </Field>

            <div className="sm:col-span-2">
              <Field label="Keterangan">
                <textarea
                  ref={keteranganRef}
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  rows={2}
                  placeholder="Catatan tambahan (opsional)"
                  className="input-glass resize-none"
                />
              </Field>
            </div>

            <div className="sm:col-span-2 rounded-xl border border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan)]/5 p-2.5">
              <div className="text-[10px] uppercase tracking-wide text-[var(--neon-cyan)] mb-1.5">
                Preview Pencatatan Otomatis
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <PreviewRow
                  icon={<ArrowDownCircle className="h-4 w-4 text-[var(--neon-green)]" />}
                  label="Aset Bertambah"
                  account={aset ? `${aset.code} — ${aset.name}` : "—"}
                  amount={nominal}
                />
                <PreviewRow
                  icon={<ArrowUpCircle className="h-4 w-4 text-[var(--neon-cyan)]" />}
                  label="Kas / Bank Berkurang"
                  account={kasBank ? `${kasBank.code} — ${kasBank.name}` : "—"}
                  amount={nominal}
                />
              </div>
            </div>

            <div className="sm:col-span-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              <button
                onClick={onClose}
                className="rounded-lg border border-white/10 bg-secondary/40 px-4 py-2 text-sm hover:bg-secondary transition"
              >
                Batal
              </button>
              <button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || !aset || !kasBankId || nominal <= 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-green)] to-amber-300 px-5 py-2 text-sm font-medium text-[oklch(0.15_0.03_250)] glow-cyan hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
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

type PendapatanCategory = {
  key: string;
  label: string;
  prefix: string;
  hint: string;
};

const PENDAPATAN_CATEGORIES: PendapatanCategory[] = [
  { key: "wisata", label: "Wisata & Tiket", prefix: "4.1.01.", hint: "Tiket, wahana, paket wisata" },
  { key: "air", label: "Air Bersih", prefix: "4.1.02.", hint: "Pengelolaan air bersih" },
  { key: "sampah", label: "Sampah", prefix: "4.1.03.", hint: "Pengelolaan sampah" },
  { key: "sewa", label: "Sewa", prefix: "4.1.04.", hint: "Sewa tempat, gedung, kendaraan" },
  { key: "jasa", label: "Jasa Pelayanan", prefix: "4.1.05.", hint: "Jasa pembayaran, layanan" },
  { key: "parkir", label: "Parkir", prefix: "4.1.07.", hint: "Parkir motor & mobil" },
  { key: "usp", label: "Simpan Pinjam", prefix: "4.1.08.", hint: "Bunga, denda, USP" },
  { key: "dagang", label: "Penjualan Barang", prefix: "4.2.01.", hint: "Makanan, suvenir, dagangan" },
  { key: "fnb", label: "Restoran & Kopi", prefix: "4.3.01.", hint: "Katering, restoran, kopi" },
  { key: "piutang", label: "Penerimaan Piutang", prefix: "1.1.03.", hint: "Pelunasan piutang usaha" },
];

function PenerimaanKasDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [tanggal, setTanggal] = useState(today);
  const [categoryKey, setCategoryKey] = useState<string>("");
  const [sumberId, setSumberId] = useState<string>("");
  const [kasBankId, setKasBankId] = useState("");
  const [jumlah, setJumlah] = useState<string>("");
  const [keterangan, setKeterangan] = useState("");

  const jumlahRef = useRef<HTMLInputElement>(null);
  const keteranganRef = useRef<HTMLTextAreaElement>(null);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["coa_accounts_penerimaan"],
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

  const kasBankAccounts = useMemo(
    () =>
      (accounts ?? []).filter(
        (a) => a.type === "ASET" && (a.code.startsWith("1.1.01.") || a.code.startsWith("1.1.02.")),
      ),
    [accounts],
  );

  if (!kasBankId && kasBankAccounts.length > 0) {
    const def = kasBankAccounts.find((a) => /kas tunai/i.test(a.name)) ?? kasBankAccounts[0];
    queueMicrotask(() => setKasBankId(def.id));
  }

  const category = PENDAPATAN_CATEGORIES.find((c) => c.key === categoryKey);

  // Akun pasangan (kredit): Pendapatan untuk kategori revenue, Piutang Usaha untuk pelunasan piutang.
  const sumberAccounts = useMemo(() => {
    if (!category || !accounts) return [];
    return accounts.filter(
      (a) => a.code.startsWith(category.prefix) && !/diskon/i.test(a.name),
    );
  }, [category, accounts]);

  const sumber = sumberAccounts.find((a) => a.id === sumberId) ?? sumberAccounts[0];
  const kasBank = kasBankAccounts.find((a) => a.id === kasBankId);
  const nominal = Number(jumlah.replace(/[^\d]/g, "")) || 0;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!sumber || !kasBank) throw new Error("Pilih kategori dan kas/bank tujuan");
      if (nominal <= 0) throw new Error("Jumlah penerimaan harus lebih dari 0");

      const { data: je, error: jeErr } = await supabase
        .from("journal_entries")
        .insert({
          transaction_date: tanggal,
          transaction_type: "PENERIMAAN_KAS",
          description: keterangan || `Penerimaan kas ${sumber.name}`,
          total_amount: nominal,
        })
        .select("id")
        .single();
      if (jeErr) throw jeErr;

      // Debit: Kas/Bank (ASET bertambah). Credit: akun sumber (pendapatan = kredit, piutang = aset berkurang juga di kredit).
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
          account_id: sumber.id,
          account_code: sumber.code,
          account_name: sumber.name,
          debit: 0,
          credit: nominal,
          line_order: 2,
        },
      ]);
      if (linesErr) throw linesErr;
    },
    onSuccess: () => {
      toast.success("Penerimaan kas berhasil dicatat");
      qc.invalidateQueries({ queryKey: ["journal_entries"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
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
        className="glass-card relative w-full sm:max-w-3xl max-h-[96vh] overflow-hidden rounded-t-2xl sm:rounded-2xl border border-white/10 p-4 sm:p-5 shadow-[0_0_60px_rgba(34,211,238,0.25)] animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg bg-secondary/60 hover:bg-secondary transition"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-3">
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-400 to-[var(--neon-cyan)] text-[oklch(0.15_0.03_250)]">
              <Wallet className="h-4 w-4" />
            </span>
            Catat Penerimaan Kas
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pemasukan kas dari operasional. Sistem otomatis menyiapkan jurnal.
          </p>
        </div>

        {isLoading ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--neon-cyan)]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Field label="Tanggal Transaksi">
              <DateField value={tanggal} onChange={setTanggal} />
            </Field>

            <Field label="Diterima di Rekening">
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

            <div className="sm:col-span-2">
              <Field label="Jenis Penerimaan">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {PENDAPATAN_CATEGORIES.map((c) => {
                    const active = c.key === categoryKey;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => {
                          setCategoryKey(c.key);
                          setSumberId("");
                        }}
                        className={
                          "rounded-lg border px-2.5 py-2 text-left transition " +
                          (active
                            ? "border-fuchsia-400 bg-fuchsia-400/10 shadow-[0_0_15px_rgba(232,121,249,0.25)]"
                            : "border-white/10 bg-secondary/40 hover:border-white/20 hover:bg-secondary/60")
                        }
                      >
                        <div className="text-xs font-semibold leading-tight">{c.label}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{c.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>

            {category && (
              <div className="sm:col-span-2">
                <Field label="Akun Detail">
                  {sumberAccounts.length === 0 ? (
                    <p className="text-[11px] text-amber-400">
                      Akun untuk kategori ini belum tersedia di COA (prefix {category.prefix}).
                    </p>
                  ) : (
                    <select
                      value={sumber?.id ?? ""}
                      onChange={(e) => {
                        setSumberId(e.target.value);
                        queueMicrotask(() => jumlahRef.current?.focus());
                      }}
                      className="input-glass"
                    >
                      {sumberAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              </div>
            )}

            <Field label="Jumlah Diterima">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  Rp
                </span>
                <input
                  ref={jumlahRef}
                  inputMode="numeric"
                  value={jumlah ? Number(jumlah.replace(/[^\d]/g, "")).toLocaleString("id-ID") : ""}
                  onChange={(e) => setJumlah(e.target.value.replace(/[^\d]/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      keteranganRef.current?.focus();
                    }
                  }}
                  placeholder="0"
                  className="input-glass pl-9"
                />
              </div>
            </Field>

            <div className="sm:col-span-2">
              <Field label="Keterangan">
                <textarea
                  ref={keteranganRef}
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  rows={2}
                  placeholder="Catatan tambahan (opsional)"
                  className="input-glass resize-none"
                />
              </Field>
            </div>

            <div className="sm:col-span-2 rounded-xl border border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan)]/5 p-2.5">
              <div className="text-[10px] uppercase tracking-wide text-[var(--neon-cyan)] mb-1.5">
                Preview Pencatatan Otomatis
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <PreviewRow
                  icon={<ArrowDownCircle className="h-4 w-4 text-[var(--neon-green)]" />}
                  label="Kas / Bank Bertambah"
                  account={kasBank ? `${kasBank.code} — ${kasBank.name}` : "—"}
                  amount={nominal}
                />
                <PreviewRow
                  icon={<ArrowUpCircle className="h-4 w-4 text-[var(--neon-cyan)]" />}
                  label={category?.key === "piutang" ? "Piutang Berkurang" : "Pendapatan Diakui"}
                  account={sumber ? `${sumber.code} — ${sumber.name}` : "—"}
                  amount={nominal}
                />
              </div>
            </div>

            <div className="sm:col-span-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              <button
                onClick={onClose}
                className="rounded-lg border border-white/10 bg-secondary/40 px-4 py-2 text-sm hover:bg-secondary transition"
              >
                Batal
              </button>
              <button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || !sumber || !kasBankId || nominal <= 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-fuchsia-400 to-[var(--neon-cyan)] px-5 py-2 text-sm font-medium text-[oklch(0.15_0.03_250)] glow-cyan hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
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

type BebanCategory = {
  key: string;
  label: string;
  prefix: string;
  hint: string;
};

const BEBAN_CATEGORIES: BebanCategory[] = [
  { key: "gaji", label: "Gaji & Honor", prefix: "6.1.01.", hint: "Gaji, tunjangan, honor pegawai" },
  { key: "atk", label: "ATK & Perlengkapan", prefix: "6.1.02.", hint: "Alat tulis, fotokopi, konsumsi" },
  { key: "pemeliharaan", label: "Pemeliharaan", prefix: "6.1.03.", hint: "Perbaikan, pemeliharaan aset" },
  { key: "utilitas", label: "Listrik / Internet", prefix: "6.1.04.", hint: "Listrik, telepon, internet" },
  { key: "sewa", label: "Sewa & Asuransi", prefix: "6.1.05.", hint: "Sewa tempat, premi asuransi" },
  { key: "kebersihan", label: "Kebersihan & Keamanan", prefix: "6.1.06.", hint: "Kebersihan, satpam" },
  { key: "operasional", label: "Operasional Unit", prefix: "6.2.", hint: "Beban operasional unit usaha" },
  { key: "pemasaran", label: "Pemasaran & Iklan", prefix: "6.3.", hint: "Iklan, promosi, pemasaran" },
  { key: "adum_lain", label: "Adum Lainnya", prefix: "6.1.99.", hint: "Parkir, audit, perjalanan dinas" },
  { key: "hutang", label: "Bayar Hutang", prefix: "2.1.", hint: "Pelunasan hutang usaha / pinjaman" },
];

function PengeluaranOperasionalDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [tanggal, setTanggal] = useState(today);
  const [categoryKey, setCategoryKey] = useState<string>("");
  const [bebanId, setBebanId] = useState<string>("");
  const [kasBankId, setKasBankId] = useState("");
  const [jumlah, setJumlah] = useState<string>("");
  const [keterangan, setKeterangan] = useState("");

  const jumlahRef = useRef<HTMLInputElement>(null);
  const keteranganRef = useRef<HTMLTextAreaElement>(null);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["coa_accounts_pengeluaran"],
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

  const kasBankAccounts = useMemo(
    () =>
      (accounts ?? []).filter(
        (a) => a.type === "ASET" && (a.code.startsWith("1.1.01.") || a.code.startsWith("1.1.02.")),
      ),
    [accounts],
  );

  if (!kasBankId && kasBankAccounts.length > 0) {
    const def = kasBankAccounts.find((a) => /kas tunai/i.test(a.name)) ?? kasBankAccounts[0];
    queueMicrotask(() => setKasBankId(def.id));
  }

  const category = BEBAN_CATEGORIES.find((c) => c.key === categoryKey);

  // Akun debit: BEBAN untuk pengeluaran operasional, atau KEWAJIBAN (untuk bayar hutang).
  const bebanAccounts = useMemo(() => {
    if (!category || !accounts) return [];
    return accounts.filter(
      (a) =>
        a.code.startsWith(category.prefix) &&
        (category.key === "hutang" ? a.type === "KEWAJIBAN" : a.type === "BEBAN") &&
        !/penyusutan|amortisasi|penyisihan/i.test(a.name),
    );
  }, [category, accounts]);

  const beban = bebanAccounts.find((a) => a.id === bebanId) ?? bebanAccounts[0];
  const kasBank = kasBankAccounts.find((a) => a.id === kasBankId);
  const nominal = Number(jumlah.replace(/[^\d]/g, "")) || 0;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!beban || !kasBank) throw new Error("Pilih kategori dan kas/bank");
      if (nominal <= 0) throw new Error("Jumlah pengeluaran harus lebih dari 0");

      const { data: je, error: jeErr } = await supabase
        .from("journal_entries")
        .insert({
          transaction_date: tanggal,
          transaction_type: category?.key === "hutang" ? "BAYAR_HUTANG" : "PENGELUARAN_OPERASIONAL",
          description: keterangan || `Pengeluaran ${beban.name}`,
          total_amount: nominal,
        })
        .select("id")
        .single();
      if (jeErr) throw jeErr;

      // Debit: Beban (atau Kewajiban berkurang). Credit: Kas/Bank berkurang.
      const { error: linesErr } = await supabase.from("journal_entry_lines").insert([
        {
          journal_entry_id: je.id,
          account_id: beban.id,
          account_code: beban.code,
          account_name: beban.name,
          debit: nominal,
          credit: 0,
          line_order: 1,
        },
        {
          journal_entry_id: je.id,
          account_id: kasBank.id,
          account_code: kasBank.code,
          account_name: kasBank.name,
          debit: 0,
          credit: nominal,
          line_order: 2,
        },
      ]);
      if (linesErr) throw linesErr;
    },
    onSuccess: () => {
      toast.success("Pengeluaran operasional berhasil dicatat");
      qc.invalidateQueries({ queryKey: ["journal_entries"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
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
        className="glass-card relative w-full sm:max-w-3xl max-h-[96vh] overflow-hidden rounded-t-2xl sm:rounded-2xl border border-white/10 p-4 sm:p-5 shadow-[0_0_60px_rgba(251,191,36,0.2)] animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg bg-secondary/60 hover:bg-secondary transition"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-3">
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-rose-400 text-[oklch(0.15_0.03_250)]">
              <ClipboardList className="h-4 w-4" />
            </span>
            Catat Pengeluaran Operasional
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pengeluaran harian unit usaha. Sistem otomatis menyiapkan jurnal sesuai kaidah akuntansi.
          </p>
        </div>

        {isLoading ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--neon-cyan)]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Field label="Tanggal Transaksi">
              <DateField value={tanggal} onChange={setTanggal} />
            </Field>

            <Field label="Dibayar dari Rekening">
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

            <div className="sm:col-span-2">
              <Field label="Jenis Pengeluaran">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {BEBAN_CATEGORIES.map((c) => {
                    const active = c.key === categoryKey;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => {
                          setCategoryKey(c.key);
                          setBebanId("");
                        }}
                        className={
                          "rounded-lg border px-2.5 py-2 text-left transition " +
                          (active
                            ? "border-amber-400 bg-amber-400/10 shadow-[0_0_15px_rgba(251,191,36,0.25)]"
                            : "border-white/10 bg-secondary/40 hover:border-white/20 hover:bg-secondary/60")
                        }
                      >
                        <div className="text-xs font-semibold leading-tight">{c.label}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{c.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>

            {category && (
              <div className="sm:col-span-2">
                <Field label="Akun Detail">
                  {bebanAccounts.length === 0 ? (
                    <p className="text-[11px] text-amber-400">
                      Akun untuk kategori ini belum tersedia di COA (prefix {category.prefix}).
                    </p>
                  ) : (
                    <select
                      value={beban?.id ?? ""}
                      onChange={(e) => {
                        setBebanId(e.target.value);
                        queueMicrotask(() => jumlahRef.current?.focus());
                      }}
                      className="input-glass"
                    >
                      {bebanAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              </div>
            )}

            <Field label="Jumlah Dibayar">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  Rp
                </span>
                <input
                  ref={jumlahRef}
                  inputMode="numeric"
                  value={jumlah ? Number(jumlah.replace(/[^\d]/g, "")).toLocaleString("id-ID") : ""}
                  onChange={(e) => setJumlah(e.target.value.replace(/[^\d]/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      keteranganRef.current?.focus();
                    }
                  }}
                  placeholder="0"
                  className="input-glass pl-9"
                />
              </div>
            </Field>

            <div className="sm:col-span-2">
              <Field label="Keterangan">
                <textarea
                  ref={keteranganRef}
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  rows={2}
                  placeholder="Catatan tambahan (opsional)"
                  className="input-glass resize-none"
                />
              </Field>
            </div>

            <div className="sm:col-span-2 rounded-xl border border-amber-400/30 bg-amber-400/5 p-2.5">
              <div className="text-[10px] uppercase tracking-wide text-amber-400 mb-1.5">
                Preview Pencatatan Otomatis
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <PreviewRow
                  icon={<ArrowDownCircle className="h-4 w-4 text-rose-400" />}
                  label={category?.key === "hutang" ? "Hutang Berkurang" : "Beban Diakui"}
                  account={beban ? `${beban.code} — ${beban.name}` : "—"}
                  amount={nominal}
                />
                <PreviewRow
                  icon={<ArrowUpCircle className="h-4 w-4 text-amber-400" />}
                  label="Kas / Bank Berkurang"
                  account={kasBank ? `${kasBank.code} — ${kasBank.name}` : "—"}
                  amount={nominal}
                />
              </div>
            </div>

            <div className="sm:col-span-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              <button
                onClick={onClose}
                className="rounded-lg border border-white/10 bg-secondary/40 px-4 py-2 text-sm hover:bg-secondary transition"
              >
                Batal
              </button>
              <button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || !beban || !kasBankId || nominal <= 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-400 to-rose-400 px-5 py-2 text-sm font-medium text-[oklch(0.15_0.03_250)] glow-cyan hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
