import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EntityScope =
  | { kind: "pusat" }
  | { kind: "konsolidasi"; entityFilter?: string | null } // entityFilter = unit.id | "PUSAT" | null
  | { kind: "unit"; unitId: string };

export type EntityInfo = {
  id: string; // unit.id atau "PUSAT"
  name: string;
  code: string;
};

export const PUSAT_ENTITY: EntityInfo = { id: "PUSAT", name: "Pusat", code: "PUSAT" };

type UnitRow = { id: string; name: string; code: string | null; kas_account_id: string | null; is_pusat: boolean };

/** Map account_id -> unit (untuk akun yang dimiliki unit usaha, bukan pusat). */
async function loadAccountOwnership(): Promise<{
  accToUnit: Map<string, EntityInfo>;
  units: EntityInfo[];
}> {
  const [{ data: units }, { data: rk }] = await Promise.all([
    supabase.from("units").select("id,name,code,kas_account_id,is_pusat").eq("status", "Aktif"),
    supabase.from("entity_rk_accounts").select("account_id,owner_entity_id"),
  ]);
  const unitMap = new Map<string, UnitRow>();
  (units ?? []).forEach((u) => unitMap.set(u.id, u as UnitRow));

  const accToUnit = new Map<string, EntityInfo>();
  for (const u of (units ?? []) as UnitRow[]) {
    if (u.is_pusat) continue;
    if (u.kas_account_id) {
      accToUnit.set(u.kas_account_id, { id: u.id, name: u.name, code: u.code ?? u.name });
    }
  }
  for (const r of (rk ?? []) as { account_id: string; owner_entity_id: string }[]) {
    const u = unitMap.get(r.owner_entity_id);
    if (!u || u.is_pusat) continue;
    accToUnit.set(r.account_id, { id: u.id, name: u.name, code: u.code ?? u.name });
  }

  const list: EntityInfo[] = [
    PUSAT_ENTITY,
    ...((units ?? []) as UnitRow[])
      .filter((u) => !u.is_pusat)
      .map((u) => ({ id: u.id, name: u.name, code: u.code ?? u.name })),
  ];
  return { accToUnit, units: list };
}

export type LedgerLine = {
  id: string;
  journalId: string;
  date: string;
  description: string | null;
  ref: string;
  bukti: string;
  debit: number;
  credit: number;
  entity: EntityInfo;
};

export type LedgerResult = {
  opening: number;
  lines: (LedgerLine & { running: number })[];
  totalDebit: number;
  totalCredit: number;
  ending: number;
  account: { id: string; code: string; name: string; normal: "D" | "K" } | null;
  entities: EntityInfo[];
};

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const normalSide = (a: { normal_balance?: string | null; type: string }): "D" | "K" => {
  const s = (a.normal_balance ?? a.type ?? "").toUpperCase();
  if (s === "DEBIT" || s === "D" || s === "ASET" || s === "BEBAN") return "D";
  return "K";
};

type RawLine = {
  id: string;
  journal_entry_id: string;
  account_id: string;
  debit: number | string;
  credit: number | string;
};
type RawEntry = { id: string; transaction_date: string; description: string | null; transaction_type: string };

async function fetchEntryEntityMap(
  entryIds: string[],
  accToUnit: Map<string, EntityInfo>,
): Promise<Map<string, EntityInfo>> {
  if (entryIds.length === 0) return new Map();
  const out = new Map<string, EntityInfo>();
  const batches = Array.from({ length: Math.ceil(entryIds.length / 800) }, (_, i) =>
    entryIds.slice(i * 800, (i + 1) * 800),
  );
  for (const batch of batches) {
    const { data, error } = await supabase
      .from("journal_entry_lines")
      .select("journal_entry_id,account_id")
      .in("journal_entry_id", batch)
      .limit(50000);
    if (error) throw error;
    for (const r of (data ?? []) as { journal_entry_id: string; account_id: string }[]) {
      if (out.has(r.journal_entry_id)) continue;
      const ent = accToUnit.get(r.account_id);
      if (ent) out.set(r.journal_entry_id, ent);
    }
    for (const id of batch) if (!out.has(id)) out.set(id, PUSAT_ENTITY);
  }
  return out;
}

async function fetchLedger(
  accountId: string | null,
  startDate: string,
  endDate: string,
  scope: EntityScope,
): Promise<LedgerResult> {
  if (!accountId) {
    return { opening: 0, lines: [], totalDebit: 0, totalCredit: 0, ending: 0, account: null, entities: [] };
  }

  const [{ data: account, error: accErr }, ownership] = await Promise.all([
    supabase
      .from("coa_accounts")
      .select("id,code,name,type,normal_balance")
      .eq("id", accountId)
      .maybeSingle(),
    loadAccountOwnership(),
  ]);
  if (accErr) throw accErr;
  if (!account) {
    return { opening: 0, lines: [], totalDebit: 0, totalCredit: 0, ending: 0, account: null, entities: ownership.units };
  }
  const normal = normalSide(account as { normal_balance?: string; type: string });

  // Ambil semua lines untuk akun ini sampai endDate
  const { data: linesRaw, error: linesErr } = await supabase
    .from("journal_entry_lines")
    .select("id,journal_entry_id,account_id,debit,credit,journal_entries!inner(id,transaction_date,description,transaction_type)")
    .eq("account_id", accountId)
    .lte("journal_entries.transaction_date", endDate)
    .limit(20000);
  if (linesErr) throw linesErr;

  type Joined = RawLine & { journal_entries: RawEntry };
  const joined = (linesRaw ?? []) as unknown as Joined[];

  const entryIds = Array.from(new Set(joined.map((l) => l.journal_entry_id)));
  const entryEntityMap = await fetchEntryEntityMap(entryIds, ownership.accToUnit);

  // Filter by scope
  const inScope = (entId: string) => {
    const ent = entryEntityMap.get(entId) ?? PUSAT_ENTITY;
    if (scope.kind === "pusat") return ent.id === "PUSAT";
    if (scope.kind === "unit") return ent.id === scope.unitId;
    if (scope.entityFilter) return ent.id === scope.entityFilter;
    return true;
  };

  let opening = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  const out: (LedgerLine & { running: number })[] = [];
  let running = 0;

  // Sort by date then created/inserted order (id) untuk stabilitas
  joined.sort((a, b) => {
    const d = a.journal_entries.transaction_date.localeCompare(b.journal_entries.transaction_date);
    if (d !== 0) return d;
    return a.id.localeCompare(b.id);
  });

  for (const l of joined) {
    if (!inScope(l.journal_entry_id)) continue;
    const d = num(l.debit);
    const c = num(l.credit);
    const delta = normal === "D" ? d - c : c - d;
    const date = l.journal_entries.transaction_date;
    if (date < startDate) {
      opening += delta;
      running = opening;
      continue;
    }
    running += delta;
    totalDebit += d;
    totalCredit += c;
    const ent = entryEntityMap.get(l.journal_entry_id) ?? PUSAT_ENTITY;
    out.push({
      id: l.id,
      journalId: l.journal_entry_id,
      date,
      description: l.journal_entries.description,
      ref: l.journal_entries.transaction_type,
      bukti: l.journal_entry_id.slice(0, 8).toUpperCase(),
      debit: d,
      credit: c,
      entity: ent,
      running,
    });
  }

  return {
    opening,
    lines: out,
    totalDebit,
    totalCredit,
    ending: opening + (normal === "D" ? totalDebit - totalCredit : totalCredit - totalDebit),
    account: { id: account.id, code: account.code, name: account.name, normal },
    entities: ownership.units,
  };
}

export function useLedger(
  accountId: string | null,
  startDate: string,
  endDate: string,
  scope: EntityScope,
) {
  return useQuery({
    queryKey: [
      "ledger",
      accountId ?? "",
      startDate,
      endDate,
      scope.kind,
      scope.kind === "unit" ? scope.unitId : "",
      scope.kind === "konsolidasi" ? scope.entityFilter ?? "" : "",
    ],
    queryFn: () => fetchLedger(accountId, startDate, endDate, scope),
    enabled: !!accountId,
  });
}

export function useEntityList() {
  return useQuery({
    queryKey: ["ledger-entities"],
    queryFn: async () => (await loadAccountOwnership()).units,
  });
}

export function useCoaForLedger() {
  return useQuery({
    queryKey: ["coa-for-ledger"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coa_accounts")
        .select("id,code,name,type,entry_type")
        .eq("status", "Aktif")
        .neq("entry_type", "Header")
        .order("code", { ascending: true })
        .limit(2000);
      if (error) throw error;
      return data as { id: string; code: string; name: string; type: string; entry_type: string }[];
    },
  });
}
