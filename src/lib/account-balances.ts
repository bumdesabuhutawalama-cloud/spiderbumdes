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

type BalanceRow = {
  account_id: string;
  period: string;
  debit_total: number | string;
  credit_total: number | string;
};

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

const normalOf = (typeOrNormal: string): "D" | "K" => {
  const s = (typeOrNormal || "").toUpperCase();
  if (s === "DEBIT" || s === "D") return "D";
  if (s === "KREDIT" || s === "CREDIT" || s === "K") return "K";
  if (s === "ASET" || s === "BEBAN") return "D";
  return "K";
};

const toMonth = (date?: string) => (date ? date.slice(0, 7) : undefined);

async function fetchBalances(startMonth?: string, endMonth?: string): Promise<BalanceRow[]> {
  let q = supabase
    .from("account_balances")
    .select("account_id, period, debit_total, credit_total")
    .limit(20000);
  if (startMonth) q = q.gte("period", startMonth);
  if (endMonth) q = q.lte("period", endMonth);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as BalanceRow[];
}

function reduceRows(rows: BalanceRow[]): BalanceMap {
  const map: BalanceMap = new Map();
  for (const r of rows) {
    const cur = map.get(r.account_id) ?? { debit: 0, credit: 0, balance: 0 };
    cur.debit += num(r.debit_total);
    cur.credit += num(r.credit_total);
    map.set(r.account_id, cur);
  }
  return map;
}

/** Saldo akumulasi sejak awal hingga `asOfDate` (untuk Neraca). */
export function useAccountBalances(asOfDate?: string) {
  const end = toMonth(asOfDate);
  return useQuery({
    queryKey: ["balances", "asof", end ?? "all"],
    queryFn: async () => reduceRows(await fetchBalances(undefined, end)),
  });
}

/** Saldo dalam rentang tanggal (untuk Laba Rugi). */
export function useAccountBalancesPeriod(start?: string, end?: string) {
  const s = toMonth(start);
  const e = toMonth(end);
  return useQuery({
    queryKey: ["balances", "period", s ?? "", e ?? ""],
    queryFn: async () => reduceRows(await fetchBalances(s, e)),
  });
}

/** Sisi normal natural berdasar tipe akun (untuk deteksi akun kontra). */
const naturalSideOfType = (type: string): "D" | "K" => {
  const t = (type || "").toUpperCase();
  if (t === "ASET" || t === "BEBAN") return "D";
  return "K"; // KEWAJIBAN, EKUITAS, PENDAPATAN
};

/**
 * Hitung saldo per akun (sesuai normal_balance), lalu rollup ke akun Header
 * berdasarkan prefix kode. Akun kontra (normal_balance berlawanan dengan
 * sisi natural tipe akun) akan dikurangkan dari total parent.
 */
export function computeSignedBalances(
  accounts: AccountLite[],
  raw: BalanceMap,
): Map<string, number> {
  const out = new Map<string, number>();
  // Detail accounts: ending_balance per kaidah normal_balance
  for (const a of accounts) {
    const r = raw.get(a.id);
    if (!r) {
      out.set(a.id, 0);
      continue;
    }
    const n = normalOf(a.normal_balance ?? a.type);
    out.set(a.id, n === "D" ? r.debit - r.credit : r.credit - r.debit);
  }
  // Rollup header: jumlahkan semua detail descendants berdasarkan prefix kode.
  // Akun kontra (sisi normal berlawanan dengan tipe induknya) dikurangkan.
  for (const h of accounts) {
    if (h.entry_type !== "Header") continue;
    let sum = 0;
    const prefix = h.code + ".";
    const naturalParent = naturalSideOfType(h.type);
    for (const a of accounts) {
      if (a.id === h.id || a.entry_type === "Header") continue;
      if (!a.code.startsWith(prefix)) continue;
      const child = out.get(a.id) ?? 0;
      const isContra = normalOf(a.normal_balance ?? a.type) !== naturalParent;
      sum += isContra ? -child : child;
    }
    out.set(h.id, sum);
  }
  return out;
}

/** Total saldo untuk akun-akun dengan tipe tertentu (akun kontra dikurangkan). */
export function sumByType(
  accounts: AccountLite[],
  signed: Map<string, number>,
  types: string[],
): number {
  let s = 0;
  for (const a of accounts) {
    if (a.entry_type === "Header") continue;
    if (!types.includes(a.type)) continue;
    const natural = naturalSideOfType(a.type);
    const isContra = normalOf(a.normal_balance ?? a.type) !== natural;
    const v = signed.get(a.id) ?? 0;
    s += isContra ? -v : v;
  }
  return s;
}

export const formatRp = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.round(n));

export const formatRpOrDash = (n: number) => (Math.abs(n) < 0.5 ? "-" : formatRp(n));
