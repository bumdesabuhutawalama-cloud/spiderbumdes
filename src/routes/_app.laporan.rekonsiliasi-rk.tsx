import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, Scale } from "lucide-react";
import { PageHeader } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/laporan/rekonsiliasi-rk")({
  head: () => ({ meta: [{ title: "Rekonsiliasi RK · BUMDes" }] }),
  component: RekonsiliasiRkPage,
});

const fmtRp = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.round(n));

type Entity = { id: string; name: string };
type RkRow = {
  owner_entity_id: string;
  counter_entity_id: string;
  account_id: string;
  coa_accounts: { code: string; name: string };
};
type Line = { account_id: string; debit: number | string; credit: number | string };

function RekonsiliasiRkPage() {
  const { data: entities = [] } = useQuery({
    queryKey: ["entities-recon"],
    queryFn: async () => {
      const { data, error } = await supabase.from("units").select("id, name").eq("status", "Aktif").order("name");
      if (error) throw error;
      return (data ?? []) as Entity[];
    },
  });

  const { data: rk = [] } = useQuery({
    queryKey: ["entity_rk_accounts_recon"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entity_rk_accounts")
        .select("owner_entity_id, counter_entity_id, account_id, coa_accounts(code, name)");
      if (error) throw error;
      return (data ?? []) as unknown as RkRow[];
    },
  });

  const accountIds = useMemo(() => Array.from(new Set(rk.map((r) => r.account_id))), [rk]);

  const { data: lines = [] } = useQuery({
    queryKey: ["rk_lines", accountIds],
    enabled: accountIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entry_lines")
        .select("account_id, debit, credit")
        .in("account_id", accountIds)
        .limit(50000);
      if (error) throw error;
      return (data ?? []) as Line[];
    },
  });

  const balByAccount = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of lines) {
      const cur = m.get(r.account_id) ?? 0;
      m.set(r.account_id, cur + (Number(r.debit) || 0) - (Number(r.credit) || 0));
    }
    return m;
  }, [lines]);

  // Build pairs: A→B owner buku A, B→A owner buku B; saldo A−B harus 0 (saling kredit/debit)
  const pairs = useMemo(() => {
    const seen = new Set<string>();
    const result: {
      key: string;
      a: string;
      b: string;
      accA: RkRow | undefined;
      accB: RkRow | undefined;
      balA: number;
      balB: number;
      diff: number;
    }[] = [];
    for (const r of rk) {
      const key = [r.owner_entity_id, r.counter_entity_id].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      const accA = rk.find((x) => x.owner_entity_id === r.owner_entity_id && x.counter_entity_id === r.counter_entity_id);
      const accB = rk.find((x) => x.owner_entity_id === r.counter_entity_id && x.counter_entity_id === r.owner_entity_id);
      const balA = accA ? balByAccount.get(accA.account_id) ?? 0 : 0;
      const balB = accB ? balByAccount.get(accB.account_id) ?? 0 : 0;
      // RK pada buku A bertambah debit saat A tagih ke B; RK pada buku B sebagai kewajiban → balB seharusnya negatif (debit-credit)
      // Jumlah balA + balB seharusnya = 0 (cocok)
      result.push({
        key,
        a: r.owner_entity_id,
        b: r.counter_entity_id,
        accA,
        accB,
        balA,
        balB,
        diff: balA + balB,
      });
    }
    return result;
  }, [rk, balByAccount]);

  const nameOf = (id: string) => entities.find((e) => e.id === id)?.name ?? "?";

  return (
    <>
      <PageHeader
        title="Laporan Rekonsiliasi Rekening Antar Entitas"
        subtitle="Memastikan setiap RK pada buku entitas pengirim cocok dengan RK pada buku entitas penerima."
      />

      <div className="glass-card rounded-2xl p-3 sm:p-5">
        <div className="overflow-x-auto rounded-xl border border-amber-200/40 bg-[oklch(0.96_0.04_85)] text-[oklch(0.2_0.02_50)] shadow-inner">
          <table className="w-full text-sm font-mono">
            <thead className="text-[oklch(0.4_0.05_50)] border-b border-amber-300/60">
              <tr className="text-left">
                <th className="py-2 px-3"><Scale className="inline h-3.5 w-3.5 mr-1" />Pasangan Entitas</th>
                <th className="py-2 px-3">Akun RK (Buku A)</th>
                <th className="py-2 px-3 text-right">Saldo A</th>
                <th className="py-2 px-3">Akun RK (Buku B)</th>
                <th className="py-2 px-3 text-right">Saldo B</th>
                <th className="py-2 px-3 text-right">Selisih</th>
                <th className="py-2 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {pairs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[oklch(0.4_0.05_50)]">Belum ada pemetaan akun RK.</td>
                </tr>
              )}
              {pairs.map((p) => {
                const cocok = Math.abs(p.diff) < 0.5;
                return (
                  <tr key={p.key} className="border-b border-amber-300/30">
                    <td className="py-2 px-3">{nameOf(p.a)} ↔ {nameOf(p.b)}</td>
                    <td className="py-2 px-3 text-xs">{p.accA ? `${p.accA.coa_accounts.code} ${p.accA.coa_accounts.name}` : "—"}</td>
                    <td className="py-2 px-3 text-right">{fmtRp(p.balA)}</td>
                    <td className="py-2 px-3 text-xs">{p.accB ? `${p.accB.coa_accounts.code} ${p.accB.coa_accounts.name}` : "—"}</td>
                    <td className="py-2 px-3 text-right">{fmtRp(p.balB)}</td>
                    <td className={"py-2 px-3 text-right " + (cocok ? "" : "text-red-600 font-bold")}>{fmtRp(p.diff)}</td>
                    <td className="py-2 px-3 text-center">
                      {cocok ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Cocok</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-700"><AlertTriangle className="h-4 w-4" /> Selisih</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          * Saldo A & B dijumlahkan: jika nol → posisi RK seimbang (semua transfer berpasangan). Selisih ≠ 0 menandakan ada jurnal yang hilang/tidak berpasangan.
        </p>
      </div>
    </>
  );
}
