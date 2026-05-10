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
  debit: number | string;
  credit: number | string;
  journal_entries: { transaction_date: string } | { transaction_date: string }[] | null;
};

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

const normalOf = (typeOrNormal: string): "D" | "K" => {
  const s = (typeOrNormal || "").toUpperCase();
  if (s === "DEBIT" || s === "D") return "D";
  if (s === "KREDIT" || s === "CREDIT" || s === "K") return "K";
  if (s === "ASET" || s === "BEBAN") return "D";
  return "K";
};

export type UnitMode = "pusat" | "unit" | "konsolidasi";

/**
 * Baca saldo LANGSUNG dari journal_entry_lines (sumber kebenaran).
 * Filter berdasar transaction_date (bukan period bulanan) supaya akurat
 * sampai tanggal tertentu. Tabel `account_balances` tidak digunakan karena
 * pernah mengalami drift; jurnal adalah satu-satunya truth source.
 */
async function fetchBalances(
  startDate?: string,
  endDate?: string,
  _mode: UnitMode = "pusat",
  _unitId?: string | null,
): Promise<LineRow[]> {
  let q = supabase
    .from("journal_entry_lines")
    .select("account_id, debit, credit, journal_entries!inner(transaction_date)")
    .limit(50000);
  if (startDate) q = q.gte("journal_entries.transaction_date", startDate);
  if (endDate) q = q.lte("journal_entries.transaction_date", endDate);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as LineRow[];
}

function reduceRows(rows: LineRow[]): BalanceMap {
  const map: BalanceMap = new Map();
  for (const r of rows) {
    const cur = map.get(r.account_id) ?? { debit: 0, credit: 0, balance: 0 };
    cur.debit += num(r.debit);
    cur.credit += num(r.credit);
    map.set(r.account_id, cur);
  }
  return map;
}

/** Saldo akumulasi sejak awal hingga `asOfDate` (untuk Neraca). */
export function useAccountBalances(
  asOfDate?: string,
  mode: UnitMode = "pusat",
  unitId?: string | null,
) {
  const end = toMonth(asOfDate);
  return useQuery({
    queryKey: ["balances", "asof", end ?? "all", mode, unitId ?? ""],
    queryFn: async () => reduceRows(await fetchBalances(undefined, end, mode, unitId)),
  });
}

/** Saldo dalam rentang tanggal (untuk Laba Rugi). */
export function useAccountBalancesPeriod(
  start?: string,
  end?: string,
  mode: UnitMode = "pusat",
  unitId?: string | null,
) {
  const s = toMonth(start);
  const e = toMonth(end);
  return useQuery({
    queryKey: ["balances", "period", s ?? "", e ?? "", mode, unitId ?? ""],
    queryFn: async () => reduceRows(await fetchBalances(s, e, mode, unitId)),
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
