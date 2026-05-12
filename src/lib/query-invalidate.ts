import type { QueryClient } from "@tanstack/react-query";

// All queryKey prefixes that read journals / balances / financial reports.
// Any query whose first key element matches (or starts with) one of these
// strings will be invalidated when a transaction mutates the ledger.
const FINANCIAL_KEYS = [
  "balances",
  "journal_entries",
  "journal_entry_lines",
  "ledger",
  "ledger-entities",
  "coa-for-ledger",
  "reports",
  "report_cache",
  "entity_transfers",
  "entity_rk_accounts",
  "entity_rk_account_ids",
  "entity_rk_account_ids_dashboard",
  "loans",
  "loan_installments",
  "net-profit",
  "bh-liab-balance",
  "rk_lines",
  "coa_accounts_dashboard",
  "units_top_perf",
  "unit_revenues_month",
  "revenue_trend_12m",
  "units_active_count",
  "usp_loan_stats",
  "usp_recent_activity",
  "pdc",
  "pdr",
];

/**
 * Invalidate every React Query cache that depends on journal data so the
 * Neraca, Laba Rugi, Buku Besar, Dashboard, and other reports refetch
 * automatically after a transaction is saved.
 *
 * Uses `refetchType: "active"` to only network-fetch queries that are
 * currently mounted; inactive queries are simply marked stale.
 */
export async function invalidateFinancials(qc: QueryClient): Promise<void> {
  await qc.invalidateQueries({
    predicate: (q) => {
      const key = q.queryKey?.[0];
      if (typeof key !== "string") return false;
      return FINANCIAL_KEYS.some(
        (f) => key === f || key.startsWith(`${f}-`) || key.startsWith(`${f}_`),
      );
    },
    refetchType: "active",
  });
}
