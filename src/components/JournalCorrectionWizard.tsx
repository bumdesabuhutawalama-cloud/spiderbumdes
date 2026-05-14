import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RotateCcw, Calculator, ArrowLeftRight, FileEdit, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchJournalWithLines,
  createReversal,
  createAmountAdjustment,
  createReclass,
  createFullAdjustment,
  type CorrectionType,
  type JournalEntry,
  type JournalLine,
} from "@/lib/journal-correction";

type WizardProps = {
  journalId: string | null;
  onClose: () => void;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);

const todayISO = () => new Date().toISOString().slice(0, 10);

type Step = "pick" | "form";

const TYPES: {
  key: CorrectionType;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}[] = [
  {
    key: "reversal",
    label: "Reversal (Pembalik Penuh)",
    desc: "Balikkan jurnal 100%. Debit ↔ Kredit ditukar. Tanpa input.",
    icon: RotateCcw,
    accent: "from-rose-500/30 to-rose-500/5",
  },
  {
    key: "adjust_amount",
    label: "Koreksi Nominal",
    desc: "Ubah total nominal jurnal. Sistem hitung selisihnya otomatis.",
    icon: Calculator,
    accent: "from-amber-500/30 to-amber-500/5",
  },
  {
    key: "reclass",
    label: "Reklasifikasi Akun",
    desc: "Pindahkan satu baris ke akun lain. Nominal tetap.",
    icon: ArrowLeftRight,
    accent: "from-cyan-500/30 to-cyan-500/5",
  },
  {
    key: "full_adjustment",
    label: "Koreksi Gabungan",
    desc: "Mode lanjutan. Susun ulang baris jurnal secara bebas.",
    icon: FileEdit,
    accent: "from-violet-500/30 to-violet-500/5",
  },
];

export function JournalCorrectionWizard({ journalId, onClose }: WizardProps) {
  const open = !!journalId;
  const [step, setStep] = useState<Step>("pick");
  const [type, setType] = useState<CorrectionType | null>(null);

  useEffect(() => {
    if (open) {
      setStep("pick");
      setType(null);
    }
  }, [open, journalId]);

  const { data: journal, isLoading } = useQuery({
    queryKey: ["journal-correction-source", journalId],
    queryFn: () => fetchJournalWithLines(journalId!),
    enabled: !!journalId,
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Wizard Jurnal Koreksi</DialogTitle>
          <DialogDescription>
            Sistem akan membuat jurnal baru. Jurnal asli tidak diubah.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !journal ? (
          <p className="text-sm text-muted-foreground">Memuat jurnal...</p>
        ) : step === "pick" ? (
          <PickStep
            journal={journal}
            onPick={(t) => {
              setType(t);
              setStep("form");
            }}
          />
        ) : (
          <FormStep
            journal={journal}
            type={type!}
            onBack={() => setStep("pick")}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function JournalSummary({ journal }: { journal: JournalEntry }) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/30 p-3 text-xs space-y-1">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Tanggal</span>
        <span>{journal.transaction_date}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Tipe</span>
        <span>{journal.transaction_type}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Deskripsi</span>
        <span className="truncate max-w-[60%] text-right">
          {journal.description ?? "-"}
        </span>
      </div>
      <div className="flex justify-between font-medium">
        <span className="text-muted-foreground">Total</span>
        <span>Rp {fmt(Number(journal.total_amount))}</span>
      </div>
    </div>
  );
}

function PickStep({
  journal,
  onPick,
}: {
  journal: JournalEntry;
  onPick: (t: CorrectionType) => void;
}) {
  return (
    <div className="space-y-3">
      <JournalSummary journal={journal} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {TYPES.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => onPick(t.key)}
              className={`group text-left rounded-xl border border-border/60 bg-gradient-to-br ${t.accent} p-3 hover:border-[var(--neon-cyan)]/60 transition`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4" />
                <span className="text-sm font-semibold">{t.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FormStep({
  journal,
  type,
  onBack,
  onDone,
}: {
  journal: JournalEntry;
  type: CorrectionType;
  onBack: () => void;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(todayISO());

  const submit = useMutation({
    mutationFn: async (payload: unknown) => payload,
    onSuccess: () => {
      toast.success("Jurnal koreksi berhasil dibuat.");
      qc.invalidateQueries({ queryKey: ["journals-correctable"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const guard = () => {
    if (!reason.trim()) {
      toast.error("Alasan koreksi wajib diisi.");
      return false;
    }
    return true;
  };

  return (
    <div className="space-y-4">
      <JournalSummary journal={journal} />

      {type === "reversal" && (
        <ReversalForm
          reason={reason}
          setReason={setReason}
          date={date}
          setDate={setDate}
          onSubmit={async () => {
            if (!guard()) return;
            await createReversal({ journalId: journal.id, reason, date });
            submit.mutate(null);
          }}
        />
      )}

      {type === "adjust_amount" && (
        <AdjustAmountForm
          journal={journal}
          reason={reason}
          setReason={setReason}
          date={date}
          setDate={setDate}
          onSubmit={async (newAmount) => {
            if (!guard()) return;
            await createAmountAdjustment({
              journalId: journal.id,
              newAmount,
              reason,
              date,
            });
            submit.mutate(null);
          }}
        />
      )}

      {type === "reclass" && (
        <ReclassForm
          journal={journal}
          reason={reason}
          setReason={setReason}
          date={date}
          setDate={setDate}
          onSubmit={async (lineId, newAccountId) => {
            if (!guard()) return;
            await createReclass({
              journalId: journal.id,
              lineId,
              newAccountId,
              reason,
              date,
            });
            submit.mutate(null);
          }}
        />
      )}

      {type === "full_adjustment" && (
        <FullAdjustmentForm
          journal={journal}
          reason={reason}
          setReason={setReason}
          date={date}
          setDate={setDate}
          onSubmit={async (lines) => {
            if (!guard()) return;
            await createFullAdjustment({
              journalId: journal.id,
              lines,
              reason,
              date,
            });
            submit.mutate(null);
          }}
        />
      )}

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>
          Kembali
        </Button>
      </div>
    </div>
  );
}

function CommonFields({
  reason,
  setReason,
  date,
  setDate,
}: {
  reason: string;
  setReason: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="korr-date">Tanggal koreksi</Label>
        <Input
          id="korr-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="korr-reason">Alasan koreksi</Label>
        <Textarea
          id="korr-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Contoh: salah input nominal pada transaksi tanggal X"
          rows={3}
        />
      </div>
    </div>
  );
}

function ReversalForm({
  reason,
  setReason,
  date,
  setDate,
  onSubmit,
}: {
  reason: string;
  setReason: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  onSubmit: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs">
        Sistem akan membuat jurnal pembalik 100% (debit ↔ kredit ditukar).
        Jurnal asli akan ditandai sebagai <b>Corrected</b>.
      </div>
      <CommonFields
        reason={reason}
        setReason={setReason}
        date={date}
        setDate={setDate}
      />
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onSubmit();
          } finally {
            setBusy(false);
          }
        }}
        className="w-full"
      >
        {busy ? "Memproses..." : "Buat Jurnal Pembalik"}
      </Button>
    </div>
  );
}

function AdjustAmountForm({
  journal,
  reason,
  setReason,
  date,
  setDate,
  onSubmit,
}: {
  journal: JournalEntry;
  reason: string;
  setReason: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  onSubmit: (newAmount: number) => Promise<void>;
}) {
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const newAmount = Number(val) || 0;
  const delta = newAmount - Number(journal.total_amount);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Nominal lama</Label>
          <Input value={fmt(Number(journal.total_amount))} readOnly />
        </div>
        <div>
          <Label htmlFor="korr-amt">Nominal seharusnya</Label>
          <Input
            id="korr-amt"
            type="number"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>
      <div className="rounded-lg border border-border/60 bg-secondary/30 p-3 text-xs flex justify-between">
        <span className="text-muted-foreground">Selisih (otomatis)</span>
        <span className={delta < 0 ? "text-rose-400" : "text-emerald-400"}>
          {delta >= 0 ? "+" : ""}
          {fmt(delta)}
        </span>
      </div>
      <CommonFields
        reason={reason}
        setReason={setReason}
        date={date}
        setDate={setDate}
      />
      <Button
        disabled={busy || !val}
        onClick={async () => {
          setBusy(true);
          try {
            await onSubmit(newAmount);
          } catch (e) {
            toast.error((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
        className="w-full"
      >
        {busy ? "Memproses..." : "Buat Jurnal Koreksi Selisih"}
      </Button>
    </div>
  );
}

function useCoaList() {
  return useQuery({
    queryKey: ["coa-correction"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coa_accounts")
        .select("id,code,name")
        .eq("status", "Aktif")
        .neq("entry_type", "Header")
        .order("code", { ascending: true })
        .limit(2000);
      if (error) throw error;
      return data as { id: string; code: string; name: string }[];
    },
  });
}

function ReclassForm({
  journal,
  reason,
  setReason,
  date,
  setDate,
  onSubmit,
}: {
  journal: JournalEntry;
  reason: string;
  setReason: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  onSubmit: (lineId: string, newAccountId: string) => Promise<void>;
}) {
  const [lineId, setLineId] = useState<string>(journal.lines[0]?.id ?? "");
  const [accId, setAccId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const { data: coa } = useCoaList();
  const selected = journal.lines.find((l) => l.id === lineId);

  return (
    <div className="space-y-3">
      <div>
        <Label>Pilih baris yang salah</Label>
        <div className="space-y-1.5 mt-1">
          {journal.lines.map((l) => (
            <label
              key={l.id}
              className={`flex items-center gap-2 rounded-lg border p-2 text-xs cursor-pointer ${
                lineId === l.id
                  ? "border-[var(--neon-cyan)] bg-secondary/60"
                  : "border-border/60 bg-secondary/20"
              }`}
            >
              <input
                type="radio"
                checked={lineId === l.id}
                onChange={() => setLineId(l.id)}
              />
              <span className="flex-1">
                {l.account_code} — {l.account_name}
              </span>
              <span className="text-muted-foreground">
                {Number(l.debit) > 0 ? "D" : "K"}{" "}
                {fmt(Number(l.debit) || Number(l.credit))}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Akun lama</Label>
          <Input
            value={
              selected ? `${selected.account_code} — ${selected.account_name}` : ""
            }
            readOnly
          />
        </div>
        <div>
          <Label>Akun tujuan</Label>
          <Select value={accId} onValueChange={setAccId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih akun..." />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {(coa ?? [])
                .filter((a) => a.id !== selected?.account_id)
                .map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Nominal</Label>
        <Input
          value={
            selected
              ? fmt(Number(selected.debit) || Number(selected.credit))
              : ""
          }
          readOnly
        />
      </div>
      <CommonFields
        reason={reason}
        setReason={setReason}
        date={date}
        setDate={setDate}
      />
      <Button
        disabled={busy || !accId || !lineId}
        onClick={async () => {
          setBusy(true);
          try {
            await onSubmit(lineId, accId);
          } catch (e) {
            toast.error((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
        className="w-full"
      >
        {busy ? "Memproses..." : "Buat Jurnal Reklasifikasi"}
      </Button>
    </div>
  );
}

type EditLine = {
  account_id: string;
  account_code: string;
  account_name: string;
  debit: string;
  credit: string;
};

function FullAdjustmentForm({
  journal,
  reason,
  setReason,
  date,
  setDate,
  onSubmit,
}: {
  journal: JournalEntry;
  reason: string;
  setReason: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  onSubmit: (
    lines: {
      account_id: string;
      account_code: string;
      account_name: string;
      debit: number;
      credit: number;
    }[],
  ) => Promise<void>;
}) {
  const { data: coa } = useCoaList();
  const [lines, setLines] = useState<EditLine[]>(() =>
    journal.lines.map((l: JournalLine) => ({
      account_id: l.account_id,
      account_code: l.account_code,
      account_name: l.account_name,
      debit: String(Number(l.debit) || ""),
      credit: String(Number(l.credit) || ""),
    })),
  );
  const [busy, setBusy] = useState(false);

  const totals = useMemo(() => {
    const d = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const c = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
    return { d, c, balanced: Math.round(d) === Math.round(c) && d > 0 };
  }, [lines]);

  const updateLine = (idx: number, patch: Partial<EditLine>) =>
    setLines((curr) => curr.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const setAccount = (idx: number, accId: string) => {
    const a = (coa ?? []).find((x) => x.id === accId);
    if (!a) return;
    updateLine(idx, {
      account_id: a.id,
      account_code: a.code,
      account_name: a.name,
    });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-violet-500/40 bg-violet-500/10 p-3 text-xs">
        Mode lanjutan. Anda menentukan baris debit/kredit secara manual.
        Jurnal harus seimbang sebelum disimpan.
      </div>

      <div className="space-y-2">
        {lines.map((l, idx) => (
          <div
            key={idx}
            className="grid grid-cols-12 gap-2 items-end rounded-lg border border-border/60 bg-secondary/20 p-2"
          >
            <div className="col-span-12 sm:col-span-6">
              <Label className="text-[10px]">Akun</Label>
              <Select
                value={l.account_id}
                onValueChange={(v) => setAccount(idx, v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih akun..." />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {(coa ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.code} — {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-5 sm:col-span-2">
              <Label className="text-[10px]">Debit</Label>
              <Input
                type="number"
                value={l.debit}
                onChange={(e) => updateLine(idx, { debit: e.target.value, credit: "" })}
              />
            </div>
            <div className="col-span-5 sm:col-span-3">
              <Label className="text-[10px]">Kredit</Label>
              <Input
                type="number"
                value={l.credit}
                onChange={(e) => updateLine(idx, { credit: e.target.value, debit: "" })}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLines((curr) => curr.filter((_, i) => i !== idx))}
                disabled={lines.length <= 2}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setLines((curr) => [
              ...curr,
              { account_id: "", account_code: "", account_name: "", debit: "", credit: "" },
            ])
          }
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Tambah baris
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded border border-border/60 bg-secondary/30 p-2">
          <p className="text-muted-foreground">Total Debit</p>
          <p className="font-semibold">{fmt(totals.d)}</p>
        </div>
        <div className="rounded border border-border/60 bg-secondary/30 p-2">
          <p className="text-muted-foreground">Total Kredit</p>
          <p className="font-semibold">{fmt(totals.c)}</p>
        </div>
        <div
          className={`rounded p-2 border ${totals.balanced ? "border-emerald-500/50 bg-emerald-500/10" : "border-rose-500/50 bg-rose-500/10"}`}
        >
          <p className="text-muted-foreground">Status</p>
          <p className="font-semibold">{totals.balanced ? "Seimbang" : "Belum seimbang"}</p>
        </div>
      </div>

      <CommonFields
        reason={reason}
        setReason={setReason}
        date={date}
        setDate={setDate}
      />

      <Button
        disabled={busy || !totals.balanced}
        onClick={async () => {
          setBusy(true);
          try {
            await onSubmit(
              lines
                .filter((l) => l.account_id && (Number(l.debit) > 0 || Number(l.credit) > 0))
                .map((l) => ({
                  account_id: l.account_id,
                  account_code: l.account_code,
                  account_name: l.account_name,
                  debit: Number(l.debit) || 0,
                  credit: Number(l.credit) || 0,
                })),
            );
          } catch (e) {
            toast.error((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
        className="w-full"
      >
        {busy ? "Memproses..." : "Simpan Jurnal Koreksi"}
      </Button>
    </div>
  );
}
