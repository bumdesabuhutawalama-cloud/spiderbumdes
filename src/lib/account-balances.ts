import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AccountLite = {
  id: string;
  code: string;
  name: string;
  type: string;
  entry_type: string;
  normal_balance?: string;
};

export type Balance = { debit: number; credit: number; balance: number };

export type BalanceMap = Map<string, Balance>;

type LineRow = {
  account_id: string;
  account_code: string;
  debit: number | string;
  credit: number | string;
  journal_entries: { transaction_date: string } | { transaction_date: string }[] | null;
};

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

const normalOf = (typeOrNormal: string): "D" | "K" => {
  const s = (typeOrNormal || "").toUpperCase();
  if (s === "DEBIT" || s === "D") return "D";
  if (s === "KREDIT" || s === "CREDIT" || s === "K") return "K";
  // type fallback
  if (s === "ASET" || s === "BEBAN") return "D";
  return "K"; // KEWAJIBAN, EKUITAS, PENDAPATAN
};

async function fetchLines(start?: string, end?: string): Promise<LineRow[]> {
  let q = supabase
    .from("journal_entry_lines")
    .select("account_id, account_code, debit, credit, journal_entries!inner(transaction_date)")
    .limit(10000);
  if (start) q = q.gte("journal_entries.transaction_date", start);
  if (end) q = q.lte("journal_entries.transaction_date", end);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as LineRow[];
}

function reduceLines(lines: LineRow[]): BalanceMap {
  const map: BalanceMap = new Map();
  for (const l of lines) {
    const cur = map.get(l.account_id) ?? { debit: 0, credit: 0, balance: 0 };
    cur.debit += num(l.debit);
    cur.credit += num(l.credit);
    map.set(l.account_id, cur);
  }
  return map;
}

/** Saldo akumulasi sejak awal hingga `asOfDate` (untuk Neraca). */
export function useAccountBalances(asOfDate?: string) {
  return useQuery({
    queryKey: ["balances", "asof", asOfDate ?? "all"],
    queryFn: async () => reduceLines(await fetchLines(undefined, asOfDate)),
  });
}

/** Saldo dalam rentang tanggal (untuk Laba Rugi). */
export function useAccountBalancesPeriod(start?: string, end?: string) {
  return useQuery({
    queryKey: ["balances", "period", start ?? "", end ?? ""],
    queryFn: async () => reduceLines(await fetchLines(start, end)),
  });
}

/**
 * Hitung saldo per akun (sesuai normal balance), lalu rollup ke akun Header
 * berdasarkan prefix kode. Returns Map<account_id, signedBalance>.
 */
export function computeSignedBalances(
  accounts: AccountLite[],
  raw: BalanceMap,
): Map<string, number> {
  const out = new Map<string, number>();
  // Detail accounts
  for (const a of accounts) {
    const r = raw.get(a.id);
    if (!r) {
      out.set(a.id, 0);
      continue;
    }
    const n = normalOf(a.normal_balance ?? a.type);
    out.set(a.id, n === "D" ? r.debit - r.credit : r.credit - r.debit);
  }
  // Rollup headers: header total = sum of detail descendants whose code starts with header.code + "."
  for (const h of accounts) {
    if (h.entry_type !== "Header") continue;
    let sum = 0;
    const prefix = h.code + ".";
    for (const a of accounts) {
      if (a.id === h.id || a.entry_type === "Header") continue;
      if (a.code.startsWith(prefix)) sum += out.get(a.id) ?? 0;
    }
    out.set(h.id, sum);
  }
  return out;
}

/** Total saldo untuk akun-akun dengan tipe tertentu. */
export function sumByType(
  accounts: AccountLite[],
  signed: Map<string, number>,
  types: string[],
): number {
  let s = 0;
  for (const a of accounts) {
    if (a.entry_type === "Header") continue;
    if (!types.includes(a.type)) continue;
    s += signed.get(a.id) ?? 0;
  }
  return s;
}

export const formatRp = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.round(n));

export const formatRpOrDash = (n: number) => (Math.abs(n) < 0.5 ? "-" : formatRp(n));
