import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowDownCircle, ArrowUpCircle, HandCoins, Banknote, AlertTriangle, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invalidateFinancials } from "@/lib/query-invalidate";
import { toast } from "sonner";
import { ActivityFormShell } from "@/components/ActivityFormShell";

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

function useUspAccounts() {
  return useQuery({
    queryKey: ["coa_accounts_usp"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coa_accounts")
        .select("*")
        .eq("status", "Aktif")
        .eq("entry_type", "Detail")
        .order("code")
        .limit(2000);
      if (error) throw error;
      return data as Account[];
    },
  });
}

function useUspUnit() {
  return useQuery({
    queryKey: ["unit_usp"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, name, code")
        .eq("code", "USP")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function Shell({
  title,
  icon,
  onClose,
  accent,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  accent?: string;
  children: React.ReactNode;
}) {
  // onClose dipertahankan untuk back-compat (dipakai tombol Batal di dalam form).
  void onClose;
  return (
    <ActivityFormShell title={title} icon={icon} accent={accent}>
      {children}
    </ActivityFormShell>
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

function MoneyInput({
  value,
  onChange,
  inputRef,
  placeholder = "0",
}: {
  value: string;
  onChange: (v: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
      <input
        ref={inputRef}
        inputMode="numeric"
        value={value ? Number(value.replace(/[^\d]/g, "")).toLocaleString("id-ID") : ""}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
        placeholder={placeholder}
        className="input-glass pl-9"
      />
    </div>
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

function SubmitBar({
  onClose,
  onSubmit,
  pending,
  disabled,
  label = "Simpan Transaksi",
}: {
  onClose: () => void;
  onSubmit: () => void;
  pending: boolean;
  disabled: boolean;
  label?: string;
}) {
  return (
    <div className="sm:col-span-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
      <button
        onClick={onClose}
        className="rounded-lg border border-white/10 bg-secondary/40 px-4 py-2 text-sm hover:bg-secondary transition"
      >
        Batal
      </button>
      <button
        onClick={onSubmit}
        disabled={disabled || pending}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] px-5 py-2 text-sm font-medium text-[oklch(0.15_0.03_250)] glow-cyan hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {label}
      </button>
    </div>
  );
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function buildSchedule(
  principal: number,
  ratePctPerYear: number,
  tenure: number,
  startDate: string,
) {
  const monthlyRate = ratePctPerYear / 100 / 12;
  const interestPerMonth = round2(principal * monthlyRate); // flat
  const principalPerMonth = round2(principal / tenure);
  const start = new Date(startDate);
  const rows: {
    installment_no: number;
    due_date: string;
    principal_due: number;
    interest_due: number;
    total_due: number;
  }[] = [];
  for (let i = 1; i <= tenure; i++) {
    const due = new Date(start);
    due.setMonth(start.getMonth() + i);
    const isLast = i === tenure;
    const principalDue = isLast
      ? round2(principal - principalPerMonth * (tenure - 1))
      : principalPerMonth;
    rows.push({
      installment_no: i,
      due_date: due.toISOString().slice(0, 10),
      principal_due: principalDue,
      interest_due: interestPerMonth,
      total_due: round2(principalDue + interestPerMonth),
    });
  }
  return { rows, monthly: round2(principalPerMonth + interestPerMonth) };
}

/* ============== Dialog 1: Pencairan Pinjaman ============== */

export function PencairanPinjamanDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: accounts, isLoading: la } = useUspAccounts();
  const { data: unit, isLoading: lu } = useUspUnit();

  const [tanggal, setTanggal] = useState(today);
  const [borrower, setBorrower] = useState("");
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("12");
  const [tenure, setTenure] = useState("12");
  const [sourceId, setSourceId] = useState("");
  const [keterangan, setKeterangan] = useState("");

  const jumlahRef = useRef<HTMLInputElement>(null);

  const sourceAccounts = useMemo(
    () => (accounts ?? []).filter((a) => ["1.1.01.06", "1.1.01.07"].includes(a.code)),
    [accounts],
  );
  useEffect(() => {
    if (!sourceId && sourceAccounts.length) setSourceId(sourceAccounts[0].id);
  }, [sourceAccounts, sourceId]);
  const piutang = useMemo(
    () => (accounts ?? []).find((a) => a.code === "1.1.03.04"),
    [accounts],
  );
  const source = sourceAccounts.find((a) => a.id === sourceId);

  const nominal = Number(principal.replace(/[^\d]/g, "")) || 0;
  const ratePct = Number(rate) || 0;
  const tenor = Math.max(1, Math.min(120, Number(tenure) || 0));
  const schedule = useMemo(
    () => (nominal > 0 && tenor > 0 ? buildSchedule(nominal, ratePct, tenor, tanggal) : null),
    [nominal, ratePct, tenor, tanggal],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (!unit) throw new Error("Unit USP belum terdaftar");
      if (!piutang) throw new Error("Akun Piutang Pinjaman USP belum tersedia");
      if (!source) throw new Error("Pilih sumber dana (Kas/Bank USP)");
      if (!borrower.trim()) throw new Error("Nama peminjam wajib diisi");
      if (nominal <= 0) throw new Error("Pokok pinjaman harus > 0");
      if (!schedule) throw new Error("Jadwal tidak valid");

      const { data: loan, error: loanErr } = await supabase
        .from("loans")
        .insert({
          unit_id: unit.id,
          borrower_name: borrower.trim(),
          principal_amount: nominal,
          interest_rate: ratePct,
          tenure_months: tenor,
          start_date: tanggal,
          monthly_installment: schedule.monthly,
          outstanding_principal: nominal,
          status: "active",
          notes: keterangan || null,
        })
        .select("id")
        .single();
      if (loanErr) throw loanErr;

      const { error: insErr } = await supabase.from("loan_installments").insert(
        schedule.rows.map((r) => ({ ...r, loan_id: loan.id })),
      );
      if (insErr) throw insErr;

      const { data: je, error: jeErr } = await supabase
        .from("journal_entries")
        .insert({
          transaction_date: tanggal,
          transaction_type: "USP_PENCAIRAN",
          description: keterangan || `Pencairan pinjaman ke ${borrower}`,
          total_amount: nominal,
        })
        .select("id")
        .single();
      if (jeErr) throw jeErr;

      const { error: linesErr } = await supabase.from("journal_entry_lines").insert([
        {
          journal_entry_id: je.id,
          account_id: piutang.id,
          account_code: piutang.code,
          account_name: piutang.name,
          debit: nominal,
          credit: 0,
          line_order: 1,
        },
        {
          journal_entry_id: je.id,
          account_id: source.id,
          account_code: source.code,
          account_name: source.name,
          debit: 0,
          credit: nominal,
          line_order: 2,
        },
      ]);
      if (linesErr) throw linesErr;
    },
    onSuccess: () => {
      toast.success("Pencairan pinjaman berhasil dicatat");
      void invalidateFinancials(qc);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const loading = la || lu;
  const disabled = !borrower || !sourceId || nominal <= 0 || tenor <= 0;

  return (
    <Shell title="Pencairan Pinjaman USP" icon={<HandCoins className="h-4 w-4" />} onClose={onClose}>
      {loading ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--neon-cyan)]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Field label="Tanggal Pencairan">
            <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="input-glass" />
          </Field>
          <Field label="Nama Peminjam">
            <input value={borrower} onChange={(e) => setBorrower(e.target.value)} placeholder="cth. Budi Santoso" className="input-glass" />
          </Field>
          <Field label="Pokok Pinjaman">
            <MoneyInput value={principal} onChange={setPrincipal} inputRef={jumlahRef} />
          </Field>
          <Field label="Bunga (% per tahun)">
            <input
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value.replace(/[^\d.,]/g, ""))}
              className="input-glass"
            />
          </Field>
          <Field label="Tenor (bulan)">
            <input
              inputMode="numeric"
              value={tenure}
              onChange={(e) => setTenure(e.target.value.replace(/[^\d]/g, ""))}
              className="input-glass"
            />
          </Field>
          <Field label="Sumber Dana">
            <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className="input-glass">
              <option value="">Pilih kas/bank USP</option>
              {sourceAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Keterangan">
              <textarea
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                rows={2}
                placeholder="Catatan (opsional)"
                className="input-glass resize-none"
              />
            </Field>
          </div>

          {schedule && (
            <div className="sm:col-span-2 rounded-xl border border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan)]/5 p-2.5">
              <div className="text-[10px] uppercase tracking-wide text-[var(--neon-cyan)] mb-1.5">
                Ringkasan Jadwal Angsuran (Flat)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <div><div className="text-xs text-muted-foreground">Pokok/bln</div><div className="font-mono">{formatRp(schedule.rows[0].principal_due)}</div></div>
                <div><div className="text-xs text-muted-foreground">Bunga/bln</div><div className="font-mono">{formatRp(schedule.rows[0].interest_due)}</div></div>
                <div><div className="text-xs text-muted-foreground">Angsuran/bln</div><div className="font-mono">{formatRp(schedule.monthly)}</div></div>
                <div><div className="text-xs text-muted-foreground">Total Bunga</div><div className="font-mono">{formatRp(schedule.rows.reduce((s, r) => s + r.interest_due, 0))}</div></div>
              </div>
            </div>
          )}

          <div className="sm:col-span-2 rounded-xl border border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan)]/5 p-2.5">
            <div className="text-[10px] uppercase tracking-wide text-[var(--neon-cyan)] mb-1.5">Preview Jurnal Otomatis</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <PreviewRow icon={<ArrowDownCircle className="h-4 w-4 text-[var(--neon-green)]" />} label="Debit" account={piutang ? `${piutang.code} — ${piutang.name}` : "—"} amount={nominal} />
              <PreviewRow icon={<ArrowUpCircle className="h-4 w-4 text-[var(--neon-cyan)]" />} label="Kredit" account={source ? `${source.code} — ${source.name}` : "—"} amount={nominal} />
            </div>
          </div>

          <SubmitBar onClose={onClose} onSubmit={() => mutation.mutate()} pending={mutation.isPending} disabled={disabled} />
        </div>
      )}
    </Shell>
  );
}

/* ============== Dialog 2: Terima Angsuran ============== */

type LoanRow = {
  id: string;
  borrower_name: string;
  outstanding_principal: number;
  monthly_installment: number;
  status: string;
};

export function TerimaAngsuranDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: accounts, isLoading: la } = useUspAccounts();

  const [tanggal, setTanggal] = useState(today);
  const [loanId, setLoanId] = useState("");
  const [destId, setDestId] = useState("");
  const [amount, setAmount] = useState("");

  const { data: loans, isLoading: ll } = useQuery({
    queryKey: ["loans", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loans")
        .select("id, borrower_name, outstanding_principal, monthly_installment, status")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LoanRow[];
    },
  });

  const { data: nextInst } = useQuery({
    queryKey: ["loan_installments", "next", loanId],
    enabled: !!loanId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loan_installments")
        .select("*")
        .eq("loan_id", loanId)
        .eq("is_paid", false)
        .order("installment_no")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (nextInst && !amount) setAmount(String(Math.round(Number(nextInst.total_due))));
  }, [nextInst, amount]);

  const destAccounts = useMemo(
    () => (accounts ?? []).filter((a) => ["1.1.01.06", "1.1.01.07"].includes(a.code)),
    [accounts],
  );
  useEffect(() => {
    if (!destId && destAccounts.length) setDestId(destAccounts[0].id);
  }, [destAccounts, destId]);

  const piutang = useMemo(() => (accounts ?? []).find((a) => a.code === "1.1.03.04"), [accounts]);
  const bunga = useMemo(() => (accounts ?? []).find((a) => a.code === "4.1.08.02"), [accounts]);
  const dest = destAccounts.find((a) => a.id === destId);
  const loan = loans?.find((l) => l.id === loanId);

  const nominal = Number(amount.replace(/[^\d]/g, "")) || 0;

  // Allocate: bunga first (max interest_due), sisanya pokok
  const interestDue = Number(nextInst?.interest_due ?? 0);
  const principalDue = Number(nextInst?.principal_due ?? 0);
  const interestPart = Math.min(nominal, interestDue);
  const principalPart = Math.max(0, nominal - interestPart);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!loan) throw new Error("Pilih pinjaman");
      if (!piutang || !bunga) throw new Error("Akun USP belum lengkap");
      if (!dest) throw new Error("Pilih kas/bank USP");
      if (nominal <= 0) throw new Error("Nominal harus > 0");
      if (!nextInst) throw new Error("Tidak ada angsuran tertunggak");

      const { data: je, error: jeErr } = await supabase
        .from("journal_entries")
        .insert({
          transaction_date: tanggal,
          transaction_type: "USP_ANGSURAN",
          description: `Angsuran pinjaman dari ${loan.borrower_name}`,
          total_amount: nominal,
        })
        .select("id")
        .single();
      if (jeErr) throw jeErr;

      const lines = [
        {
          journal_entry_id: je.id,
          account_id: dest.id,
          account_code: dest.code,
          account_name: dest.name,
          debit: nominal,
          credit: 0,
          line_order: 1,
        },
      ];
      if (principalPart > 0) {
        lines.push({
          journal_entry_id: je.id,
          account_id: piutang.id,
          account_code: piutang.code,
          account_name: piutang.name,
          debit: 0,
          credit: principalPart,
          line_order: 2,
        });
      }
      if (interestPart > 0) {
        lines.push({
          journal_entry_id: je.id,
          account_id: bunga.id,
          account_code: bunga.code,
          account_name: bunga.name,
          debit: 0,
          credit: interestPart,
          line_order: 3,
        });
      }
      const { error: linesErr } = await supabase.from("journal_entry_lines").insert(lines);
      if (linesErr) throw linesErr;

      // Update installment
      const fullyPaid = nominal >= Number(nextInst.total_due) - 0.5;
      await supabase
        .from("loan_installments")
        .update({
          is_paid: fullyPaid,
          paid_date: fullyPaid ? tanggal : null,
          paid_amount: nominal,
        })
        .eq("id", nextInst.id);

      // Update loan outstanding
      const newOutstanding = Math.max(0, Number(loan.outstanding_principal) - principalPart);
      const closed = newOutstanding < 0.5;
      await supabase
        .from("loans")
        .update({
          outstanding_principal: newOutstanding,
          status: closed ? "closed" : "active",
        })
        .eq("id", loan.id);
    },
    onSuccess: () => {
      toast.success("Penerimaan angsuran berhasil dicatat");
      void invalidateFinancials(qc);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disabled = !loanId || !destId || nominal <= 0 || !nextInst;

  return (
    <Shell title="Terima Angsuran Pinjaman" icon={<Banknote className="h-4 w-4" />} onClose={onClose}>
      {la || ll ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--neon-cyan)]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Field label="Tanggal">
            <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="input-glass" />
          </Field>
          <Field label="Pinjaman Aktif">
            <select value={loanId} onChange={(e) => { setLoanId(e.target.value); setAmount(""); }} className="input-glass">
              <option value="">Pilih peminjam</option>
              {(loans ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.borrower_name} — sisa {formatRp(Number(l.outstanding_principal))}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Diterima ke">
            <select value={destId} onChange={(e) => setDestId(e.target.value)} className="input-glass">
              <option value="">Pilih kas/bank USP</option>
              {destAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nominal Diterima">
            <MoneyInput value={amount} onChange={setAmount} />
          </Field>

          {nextInst && (
            <div className="sm:col-span-2 rounded-xl border border-white/10 bg-background/40 p-2.5 text-sm">
              <div className="text-xs text-muted-foreground mb-1">Angsuran ke-{nextInst.installment_no} jatuh tempo {nextInst.due_date}</div>
              <div className="grid grid-cols-3 gap-2">
                <div><div className="text-xs text-muted-foreground">Pokok</div><div className="font-mono">{formatRp(principalDue)}</div></div>
                <div><div className="text-xs text-muted-foreground">Bunga</div><div className="font-mono">{formatRp(interestDue)}</div></div>
                <div><div className="text-xs text-muted-foreground">Total</div><div className="font-mono">{formatRp(Number(nextInst.total_due))}</div></div>
              </div>
            </div>
          )}

          <div className="sm:col-span-2 rounded-xl border border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan)]/5 p-2.5">
            <div className="text-[10px] uppercase tracking-wide text-[var(--neon-cyan)] mb-1.5">Preview Jurnal Otomatis</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <PreviewRow icon={<ArrowDownCircle className="h-4 w-4 text-[var(--neon-green)]" />} label="Debit Kas/Bank" account={dest ? `${dest.code} — ${dest.name}` : "—"} amount={nominal} />
              <PreviewRow icon={<ArrowUpCircle className="h-4 w-4 text-[var(--neon-cyan)]" />} label="Kredit Pokok" account={piutang ? `${piutang.code} — ${piutang.name}` : "—"} amount={principalPart} />
              <PreviewRow icon={<ArrowUpCircle className="h-4 w-4 text-[var(--neon-cyan)]" />} label="Kredit Bunga" account={bunga ? `${bunga.code} — ${bunga.name}` : "—"} amount={interestPart} />
            </div>
          </div>

          <SubmitBar onClose={onClose} onSubmit={() => mutation.mutate()} pending={mutation.isPending} disabled={disabled} />
        </div>
      )}
    </Shell>
  );
}

/* ============== Dialog 3: Terima Denda ============== */

export function TerimaDendaDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: accounts, isLoading } = useUspAccounts();

  const [tanggal, setTanggal] = useState(today);
  const [destId, setDestId] = useState("");
  const [amount, setAmount] = useState("");
  const [keterangan, setKeterangan] = useState("");

  const destAccounts = useMemo(
    () => (accounts ?? []).filter((a) => ["1.1.01.06", "1.1.01.07"].includes(a.code)),
    [accounts],
  );
  useEffect(() => {
    if (!destId && destAccounts.length) setDestId(destAccounts[0].id);
  }, [destAccounts, destId]);

  const denda = useMemo(() => (accounts ?? []).find((a) => a.code === "4.1.08.03"), [accounts]);
  const dest = destAccounts.find((a) => a.id === destId);
  const nominal = Number(amount.replace(/[^\d]/g, "")) || 0;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!denda) throw new Error("Akun Pendapatan Denda USP belum tersedia");
      if (!dest) throw new Error("Pilih kas/bank USP");
      if (nominal <= 0) throw new Error("Nominal harus > 0");

      const { data: je, error: jeErr } = await supabase
        .from("journal_entries")
        .insert({
          transaction_date: tanggal,
          transaction_type: "USP_DENDA",
          description: keterangan || "Penerimaan denda keterlambatan",
          total_amount: nominal,
        })
        .select("id")
        .single();
      if (jeErr) throw jeErr;

      const { error: linesErr } = await supabase.from("journal_entry_lines").insert([
        { journal_entry_id: je.id, account_id: dest.id, account_code: dest.code, account_name: dest.name, debit: nominal, credit: 0, line_order: 1 },
        { journal_entry_id: je.id, account_id: denda.id, account_code: denda.code, account_name: denda.name, debit: 0, credit: nominal, line_order: 2 },
      ]);
      if (linesErr) throw linesErr;
    },
    onSuccess: () => {
      toast.success("Penerimaan denda berhasil dicatat");
      void invalidateFinancials(qc);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Shell title="Terima Denda Keterlambatan" icon={<AlertTriangle className="h-4 w-4" />} onClose={onClose}>
      {isLoading ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--neon-cyan)]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Field label="Tanggal">
            <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="input-glass" />
          </Field>
          <Field label="Diterima ke">
            <select value={destId} onChange={(e) => setDestId(e.target.value)} className="input-glass">
              <option value="">Pilih kas/bank USP</option>
              {destAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Nominal">
            <MoneyInput value={amount} onChange={setAmount} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Keterangan">
              <textarea value={keterangan} onChange={(e) => setKeterangan(e.target.value)} rows={2} className="input-glass resize-none" />
            </Field>
          </div>
          <div className="sm:col-span-2 rounded-xl border border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan)]/5 p-2.5">
            <div className="text-[10px] uppercase tracking-wide text-[var(--neon-cyan)] mb-1.5">Preview Jurnal Otomatis</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <PreviewRow icon={<ArrowDownCircle className="h-4 w-4 text-[var(--neon-green)]" />} label="Debit" account={dest ? `${dest.code} — ${dest.name}` : "—"} amount={nominal} />
              <PreviewRow icon={<ArrowUpCircle className="h-4 w-4 text-[var(--neon-cyan)]" />} label="Kredit" account={denda ? `${denda.code} — ${denda.name}` : "—"} amount={nominal} />
            </div>
          </div>
          <SubmitBar onClose={onClose} onSubmit={() => mutation.mutate()} pending={mutation.isPending} disabled={!destId || nominal <= 0} />
        </div>
      )}
    </Shell>
  );
}

/* ============== Dialog 4: Beban Operasional USP ============== */

export function BebanOperasionalUspDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: accounts, isLoading } = useUspAccounts();

  const [tanggal, setTanggal] = useState(today);
  const [sourceId, setSourceId] = useState("");
  const [amount, setAmount] = useState("");
  const [keterangan, setKeterangan] = useState("");

  const sourceAccounts = useMemo(
    () => (accounts ?? []).filter((a) => ["1.1.01.06", "1.1.01.07"].includes(a.code)),
    [accounts],
  );
  useEffect(() => {
    if (!sourceId && sourceAccounts.length) setSourceId(sourceAccounts[0].id);
  }, [sourceAccounts, sourceId]);

  const beban = useMemo(() => (accounts ?? []).find((a) => a.code === "6.1.10.01"), [accounts]);
  const source = sourceAccounts.find((a) => a.id === sourceId);
  const nominal = Number(amount.replace(/[^\d]/g, "")) || 0;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!beban) throw new Error("Akun Beban Operasional USP belum tersedia");
      if (!source) throw new Error("Pilih kas/bank USP");
      if (nominal <= 0) throw new Error("Nominal harus > 0");

      const { data: je, error: jeErr } = await supabase
        .from("journal_entries")
        .insert({
          transaction_date: tanggal,
          transaction_type: "USP_BEBAN",
          description: keterangan || "Beban operasional USP",
          total_amount: nominal,
        })
        .select("id")
        .single();
      if (jeErr) throw jeErr;

      const { error: linesErr } = await supabase.from("journal_entry_lines").insert([
        { journal_entry_id: je.id, account_id: beban.id, account_code: beban.code, account_name: beban.name, debit: nominal, credit: 0, line_order: 1 },
        { journal_entry_id: je.id, account_id: source.id, account_code: source.code, account_name: source.name, debit: 0, credit: nominal, line_order: 2 },
      ]);
      if (linesErr) throw linesErr;
    },
    onSuccess: () => {
      toast.success("Beban operasional USP berhasil dicatat");
      void invalidateFinancials(qc);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Shell title="Beban Operasional USP" icon={<Receipt className="h-4 w-4" />} onClose={onClose}>
      {isLoading ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--neon-cyan)]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Field label="Tanggal">
            <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="input-glass" />
          </Field>
          <Field label="Sumber Dana">
            <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className="input-glass">
              <option value="">Pilih kas/bank USP</option>
              {sourceAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Nominal">
            <MoneyInput value={amount} onChange={setAmount} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Keterangan">
              <textarea value={keterangan} onChange={(e) => setKeterangan(e.target.value)} rows={2} className="input-glass resize-none" placeholder="cth. ATK, transport survey, dll." />
            </Field>
          </div>
          <div className="sm:col-span-2 rounded-xl border border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan)]/5 p-2.5">
            <div className="text-[10px] uppercase tracking-wide text-[var(--neon-cyan)] mb-1.5">Preview Jurnal Otomatis</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <PreviewRow icon={<ArrowDownCircle className="h-4 w-4 text-[var(--neon-green)]" />} label="Debit" account={beban ? `${beban.code} — ${beban.name}` : "—"} amount={nominal} />
              <PreviewRow icon={<ArrowUpCircle className="h-4 w-4 text-[var(--neon-cyan)]" />} label="Kredit" account={source ? `${source.code} — ${source.name}` : "—"} amount={nominal} />
            </div>
          </div>
          <SubmitBar onClose={onClose} onSubmit={() => mutation.mutate()} pending={mutation.isPending} disabled={!sourceId || nominal <= 0} />
        </div>
      )}
    </Shell>
  );
}
