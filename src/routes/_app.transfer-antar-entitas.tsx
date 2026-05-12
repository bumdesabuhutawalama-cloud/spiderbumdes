import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Loader2, Building2, Send } from "lucide-react";
import { PageHeader } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DateField } from "@/components/DateField";

export const Route = createFileRoute("/_app/transfer-antar-entitas")({
  head: () => ({ meta: [{ title: "Transfer Antar Entitas · BUMDes" }] }),
  component: TransferPage,
});

type Entity = { id: string; name: string; code: string | null; is_pusat: boolean; kas_account_id: string | null };
type RkMap = { owner_entity_id: string; counter_entity_id: string; account_id: string; coa_accounts: { code: string; name: string } };
type CashAcc = { id: string; code: string; name: string };

const fmtRp = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);

function useEntities() {
  return useQuery({
    queryKey: ["entities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, name, code, is_pusat, kas_account_id")
        .eq("status", "Aktif")
        .order("is_pusat", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data ?? []) as Entity[];
    },
  });
}

function useRkMap() {
  return useQuery({
    queryKey: ["entity_rk_accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entity_rk_accounts")
        .select("owner_entity_id, counter_entity_id, account_id, coa_accounts(code, name)");
      if (error) throw error;
      return (data ?? []) as unknown as RkMap[];
    },
  });
}

function useCashAccounts() {
  return useQuery({
    queryKey: ["cash_accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coa_accounts")
        .select("id, code, name, entry_type, status")
        .eq("type", "ASET")
        .eq("status", "Aktif")
        .or("code.like.1.1.01%,code.like.1.1.02%")
        .order("code");
      if (error) throw error;
      return (data ?? []).filter((a) => a.entry_type !== "Header") as CashAcc[];
    },
  });
}

function useTransfers() {
  return useQuery({
    queryKey: ["entity_transfers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entity_transfers")
        .select("*")
        .order("transfer_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

async function getCashBalance(accountId: string): Promise<number> {
  const { data, error } = await supabase
    .from("journal_entry_lines")
    .select("debit, credit")
    .eq("account_id", accountId)
    .limit(50000);
  if (error) throw error;
  let d = 0, c = 0;
  for (const r of data ?? []) {
    d += Number(r.debit) || 0;
    c += Number(r.credit) || 0;
  }
  return d - c;
}

function TransferPage() {
  const qc = useQueryClient();
  const { data: entities = [] } = useEntities();
  const { data: rkMap = [] } = useRkMap();
  const { data: transfers = [] } = useTransfers();
  const { data: cashAccs = [] } = useCashAccounts();

  const today = new Date().toISOString().slice(0, 10);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [fromKasId, setFromKasId] = useState("");
  const [toKasId, setToKasId] = useState("");
  const [fromBal, setFromBal] = useState<number | null>(null);

  const fromEntity = entities.find((e) => e.id === fromId);
  const toEntity = entities.find((e) => e.id === toId);
  const rkFromSide = rkMap.find((m) => m.owner_entity_id === fromId && m.counter_entity_id === toId);
  const rkToSide = rkMap.find((m) => m.owner_entity_id === toId && m.counter_entity_id === fromId);

  // Default kas selection from entity's configured kas
  useEffect(() => {
    if (fromEntity?.kas_account_id && !fromKasId) setFromKasId(fromEntity.kas_account_id);
  }, [fromEntity, fromKasId]);
  useEffect(() => {
    if (toEntity?.kas_account_id && !toKasId) setToKasId(toEntity.kas_account_id);
  }, [toEntity, toKasId]);

  // Load source kas balance preview
  useEffect(() => {
    let alive = true;
    if (!fromKasId) { setFromBal(null); return; }
    getCashBalance(fromKasId).then((b) => { if (alive) setFromBal(b); }).catch(() => { if (alive) setFromBal(null); });
    return () => { alive = false; };
  }, [fromKasId, transfers.length]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!fromEntity || !toEntity) throw new Error("Pilih entitas asal & tujuan");
      if (fromId === toId) throw new Error("Entitas asal & tujuan tidak boleh sama");
      const amt = Number(amount);
      if (!amt || amt <= 0) throw new Error("Nominal harus > 0");
      if (!fromKasId) throw new Error(`Pilih akun Kas sumber (yang berkurang)`);
      if (!toKasId) throw new Error(`Pilih akun Kas tujuan (yang bertambah)`);
      if (fromKasId === toKasId) throw new Error("Akun kas sumber & tujuan tidak boleh sama");
      if (!rkFromSide) throw new Error(`Akun RK pada buku ${fromEntity.name} → ${toEntity.name} belum dipetakan`);
      if (!rkToSide) throw new Error(`Akun RK pada buku ${toEntity.name} → ${fromEntity.name} belum dipetakan`);

      const cash = await getCashBalance(fromKasId);
      if (cash < amt) {
        const accName = cashAccs.find((a) => a.id === fromKasId)?.name ?? "Kas sumber";
        throw new Error(`${accName} (${fromEntity.name}) tidak mencukupi. Saldo: ${fmtRp(cash)}`);
      }

      const { data: accs, error: aErr } = await supabase
        .from("coa_accounts")
        .select("id, code, name")
        .in("id", [fromKasId, toKasId, rkFromSide.account_id, rkToSide.account_id]);
      if (aErr) throw aErr;
      const byId = new Map((accs ?? []).map((a) => [a.id, a]));
      const groupId = crypto.randomUUID();
      const desc1 = `Transfer ke ${toEntity.name}` + (desc ? ` - ${desc}` : "");
      const desc2 = `Transfer dari ${fromEntity.name}` + (desc ? ` - ${desc}` : "");

      const { data: jeRows, error: jeErr } = await supabase
        .from("journal_entries")
        .insert([
          { transaction_date: date, transaction_type: "TRANSFER_ANTAR_ENTITAS", description: desc1, total_amount: amt, transfer_group_id: groupId },
          { transaction_date: date, transaction_type: "TRANSFER_ANTAR_ENTITAS", description: desc2, total_amount: amt, transfer_group_id: groupId },
        ])
        .select("id");
      if (jeErr) throw jeErr;
      const [je1, je2] = jeRows!;

      const lines = [
        { journal_entry_id: je1.id, account_id: rkFromSide.account_id, account_code: byId.get(rkFromSide.account_id)!.code, account_name: byId.get(rkFromSide.account_id)!.name, debit: amt, credit: 0, line_order: 1 },
        { journal_entry_id: je1.id, account_id: fromKasId, account_code: byId.get(fromKasId)!.code, account_name: byId.get(fromKasId)!.name, debit: 0, credit: amt, line_order: 2 },
        { journal_entry_id: je2.id, account_id: toKasId, account_code: byId.get(toKasId)!.code, account_name: byId.get(toKasId)!.name, debit: amt, credit: 0, line_order: 1 },
        { journal_entry_id: je2.id, account_id: rkToSide.account_id, account_code: byId.get(rkToSide.account_id)!.code, account_name: byId.get(rkToSide.account_id)!.name, debit: 0, credit: amt, line_order: 2 },
      ];
      const { error: lErr } = await supabase.from("journal_entry_lines").insert(lines);
      if (lErr) throw lErr;

      const { error: tErr } = await supabase.from("entity_transfers").insert({
        transfer_date: date,
        from_entity_id: fromId,
        to_entity_id: toId,
        amount: amt,
        description: desc || null,
        transfer_group_id: groupId,
        journal_from_id: je1.id,
        journal_to_id: je2.id,
      });
      if (tErr) throw tErr;

      await supabase.from("report_cache").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    },
    onSuccess: () => {
      toast.success("Transfer berhasil dicatat (jurnal pasangan otomatis)");
      setAmount("");
      setDesc("");
      qc.invalidateQueries({ queryKey: ["entity_transfers"] });
      qc.invalidateQueries({ queryKey: ["balances"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const entityName = (id: string) => entities.find((e) => e.id === id)?.name ?? "-";
  const accLabel = (id: string) => {
    const a = cashAccs.find((x) => x.id === id);
    return a ? `${a.code} — ${a.name}` : "-";
  };

  const preview = useMemo(() => {
    const amt = Number(amount) || 0;
    if (!fromEntity || !toEntity || !amt) return null;
    return {
      from: {
        dr: rkFromSide?.coa_accounts.name ?? "(RK belum dipetakan)",
        cr: fromKasId ? accLabel(fromKasId) : "(pilih kas sumber)",
        amt,
      },
      to: {
        dr: toKasId ? accLabel(toKasId) : "(pilih kas tujuan)",
        cr: rkToSide?.coa_accounts.name ?? "(RK belum dipetakan)",
        amt,
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromEntity, toEntity, amount, rkFromSide, rkToSide, fromKasId, toKasId, cashAccs]);

  return (
    <>
      <PageHeader
        title="Transfer Antar Entitas"
        subtitle="Perpindahan dana antar entitas BUMDes melalui akun Rekening Koran (RK). Dual journal otomatis."
      />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        {/* Form */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ArrowLeftRight className="h-4 w-4 text-[var(--neon-cyan)]" /> Form Transfer
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Dari Entitas">
              <select value={fromId} onChange={(e) => { setFromId(e.target.value); setFromKasId(""); }} className="input-glass">
                <option value="">— pilih —</option>
                {entities.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.is_pusat ? "🏛 " : "🏢 "}{e.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ke Entitas">
              <select value={toId} onChange={(e) => { setToId(e.target.value); setToKasId(""); }} className="input-glass">
                <option value="">— pilih —</option>
                {entities.filter((e) => e.id !== fromId).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.is_pusat ? "🏛 " : "🏢 "}{e.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={`Kas Sumber (berkurang)${fromBal !== null ? ` · saldo ${fmtRp(fromBal)}` : ""}`}>
              <select value={fromKasId} onChange={(e) => setFromKasId(e.target.value)} className="input-glass">
                <option value="">— pilih kas —</option>
                {cashAccs.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Kas Tujuan (bertambah)">
              <select value={toKasId} onChange={(e) => setToKasId(e.target.value)} className="input-glass">
                <option value="">— pilih kas —</option>
                {cashAccs.filter((a) => a.id !== fromKasId).map((a) => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Tanggal">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-glass" />
            </Field>
            <Field label="Nominal (Rp)">
              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="input-glass"
              />
            </Field>
            <Field label="Keterangan" className="sm:col-span-2">
              <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Mis. setoran modal awal, transfer operasional, dst."
                className="input-glass"
              />
            </Field>
          </div>

          {preview && (
            <div className="rounded-xl border border-border/60 bg-secondary/40 p-3 text-xs space-y-2">
              <p className="font-semibold text-[var(--neon-cyan)]">Pratinjau Jurnal Otomatis</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <div className="rounded-lg bg-background/40 p-2">
                  <p className="text-muted-foreground mb-1">Pembukuan {fromEntity!.name}</p>
                  <p>Dr <span className="text-foreground">{preview.from.dr}</span> &nbsp;<span className="text-[var(--neon-green)]">{fmtRp(preview.from.amt)}</span></p>
                  <p>Cr <span className="text-foreground">{preview.from.cr}</span> &nbsp;<span className="text-[var(--neon-green)]">{fmtRp(preview.from.amt)}</span></p>
                </div>
                <div className="rounded-lg bg-background/40 p-2">
                  <p className="text-muted-foreground mb-1">Pembukuan {toEntity!.name}</p>
                  <p>Dr <span className="text-foreground">{preview.to.dr}</span> &nbsp;<span className="text-[var(--neon-green)]">{fmtRp(preview.to.amt)}</span></p>
                  <p>Cr <span className="text-foreground">{preview.to.cr}</span> &nbsp;<span className="text-[var(--neon-green)]">{fmtRp(preview.to.amt)}</span></p>
                </div>
              </div>
            </div>
          )}

          <button
            disabled={submit.isPending || !fromId || !toId || !amount || !fromKasId || !toKasId}
            onClick={() => submit.mutate()}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] px-4 py-2 text-sm font-medium text-[oklch(0.15_0.03_250)] glow-cyan hover:opacity-90 transition disabled:opacity-50"
          >
            {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Simpan Transfer
          </button>
        </div>

        {/* List */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 text-sm font-medium mb-3">
            <Building2 className="h-4 w-4 text-[var(--neon-cyan)]" /> Riwayat Transfer
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="text-left border-b border-border/60">
                  <th className="py-2 pr-2">Tanggal</th>
                  <th className="py-2 pr-2">Dari → Ke</th>
                  <th className="py-2 pr-2 text-right">Nominal</th>
                  <th className="py-2">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {transfers.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Belum ada transfer.</td></tr>
                )}
                {transfers.map((t) => (
                  <tr key={t.id} className="border-b border-border/30">
                    <td className="py-2 pr-2 whitespace-nowrap">{t.transfer_date}</td>
                    <td className="py-2 pr-2">
                      <span className="text-muted-foreground">{entityName(t.from_entity_id)}</span>
                      {" → "}
                      <span className="text-foreground">{entityName(t.to_entity_id)}</span>
                    </td>
                    <td className="py-2 pr-2 text-right font-mono">{fmtRp(Number(t.amount))}</td>
                    <td className="py-2 text-muted-foreground">{t.description ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={"block space-y-1.5 " + className}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
