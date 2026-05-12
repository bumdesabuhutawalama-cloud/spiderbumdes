# Realtime Sync Setelah Transaksi

## Masalah
Saat audit, hampir semua mutasi transaksi (Penyertaan Modal, Belanja Aset, Penerimaan Kas, Pengeluaran, Pinjaman/Angsuran, Transfer Antar Entitas, Bagi Hasil) memang sudah memanggil `invalidateQueries({ queryKey: ["balances"] })` dan `["journal_entries"]`. Tetapi banyak query laporan lain memakai **queryKey berbeda** sehingga tidak ikut refetch:

- `["ledger-…"]` → Buku Besar Pusat / Unit / Konsolidasi
- `["coa_accounts_dashboard"]`, `["entity_rk_account_ids_dashboard"]`, `["units_top_perf"]`, `["unit_revenues_month", …]`, `["revenue_trend_12m", …]` → Dashboard
- `["net-profit", …]`, `["bh-liab-balance", …]` → Bagi Hasil
- `["rk_lines", …]` → Rekonsiliasi RK
- `["entity_transfers"]`, `["loans", …]`, `["loan_installments", …]`

Akibatnya Dashboard, Buku Besar, Rekonsiliasi RK, Bagi Hasil, dan beberapa kartu Neraca/L/R tidak update sampai user refresh manual.

## Solusi
Buat satu helper terpusat dan panggil dari setiap mutasi transaksi. Tidak ada perubahan logika akuntansi — hanya cache layer React Query.

### 1. `src/lib/query-invalidate.ts` (baru)
```ts
import type { QueryClient } from "@tanstack/react-query";

// Semua queryKey yang membaca jurnal / saldo / laporan keuangan
const FINANCIAL_KEYS = [
  "balances", "journal_entries", "journal_entry_lines",
  "ledger", "ledger-entities", "coa-for-ledger",
  "reports", "report_cache",
  "entity_transfers", "entity_rk_accounts", "entity_rk_account_ids",
  "entity_rk_account_ids_dashboard",
  "loans", "loan_installments",
  "net-profit", "bh-liab-balance",
  "rk_lines",
  "coa_accounts_dashboard",
  "units_top_perf", "unit_revenues_month", "revenue_trend_12m",
  "usp_loan_stats", "usp_recent_activity",
  "pdc", "pdr",
];

export async function invalidateFinancials(qc: QueryClient) {
  await qc.invalidateQueries({
    predicate: (q) => {
      const k = q.queryKey?.[0];
      if (typeof k !== "string") return false;
      // match exact + prefix (mis. "ledger-pusat-...", "balances-asof-...")
      return FINANCIAL_KEYS.some((f) => k === f || k.startsWith(f + "-") || k.startsWith(f));
    },
    refetchType: "active", // hanya refetch query yang sedang dipakai → hindari double fetch
  });
}
```

`refetchType: "active"` memastikan hanya halaman yang sedang dibuka melakukan network call; tab lain ditandai stale dan akan refetch saat dibuka.

### 2. Audit & ganti panggilan invalidate

Ganti blok berulang seperti:
```ts
qc.invalidateQueries({ queryKey: ["balances"] });
qc.invalidateQueries({ queryKey: ["journal_entries"] });
```
menjadi:
```ts
await invalidateFinancials(qc);
```

File yang disentuh (hanya bagian `onSuccess` mutasi):
- `src/routes/_app.usp.kegiatan.tsx` (4 dialog: Penyertaan, Belanja Aset, Penerimaan, Pengeluaran)
- `src/components/usp-dialogs.tsx` (4 dialog pinjaman + angsuran)
- `src/routes/_app.usp.transfer.tsx` (Transfer Antar Entitas)
- `src/routes/_app.laporan.bagi-hasil.tsx` (mutasi `tetapkan` & `bayar` — sekarang `invalidateQueries()` tanpa key, ganti ke helper agar lebih terarah)
- `src/routes/_app.coa.tsx` (sudah ada predicate sendiri untuk COA — tambahkan panggilan helper agar laporan ikut invalidate setelah edit COA)

### 3. Konsistensi key Buku Besar
`src/lib/ledger.ts` saat ini pakai key array kompleks. Tambahkan prefix `"ledger"` di awal agar terjaring helper:
```ts
queryKey: ["ledger", mode, unitId, startDate, endDate, accountId]
```
(Hanya rename key, hook tetap sama.)

### 4. Tidak ada perubahan logika akuntansi
- Tidak menyentuh trigger DB, tidak mengubah struktur jurnal, tidak menyentuh perhitungan saldo di `account-balances.ts` / `NeracaSheet` / `BukuBesarSheet`.
- Tidak mengaktifkan Supabase Realtime (postgres_changes) — invalidate setelah mutasi sudah cukup dan hemat koneksi. Bisa ditambahkan nanti bila perlu sinkron antar-user.

## Hasil
- Setelah klik "Simpan" pada form transaksi apapun: Neraca, Laba Rugi, Buku Besar, Dashboard saldo, kartu unit, Rekonsiliasi RK, dan Bagi Hasil otomatis refetch tanpa reload browser.
- Tidak ada double-fetch berlebihan karena memakai `refetchType: "active"`.
- Satu sumber kebenaran untuk daftar key finansial → mudah dirawat saat menambah laporan baru.
