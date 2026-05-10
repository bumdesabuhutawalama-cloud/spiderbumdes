## Tujuan

Mempercepat pemuatan laporan **Neraca** & **Laba Rugi** dari pembacaan langsung `journal_entry_lines` menjadi pembacaan **saldo termaterialisasi** + **cache laporan**, dengan tetap mempertahankan logika Activity → Journal yang sudah berjalan.

## Pendekatan

### 1. Tabel baru: `account_balances` (materialized ledger)

Kolom:
- `id` uuid PK
- `account_id` uuid (akun di `coa_accounts`)
- `unit_id` uuid nullable (untuk pusat = NULL; multi-unit menyusul saat kolom unit ada di journal)
- `period` text (`YYYY-MM`)
- `debit_total` numeric default 0
- `credit_total` numeric default 0
- `ending_balance` numeric default 0 (signed sesuai `normal_balance`)
- `updated_at` timestamptz

Unique index: `(account_id, COALESCE(unit_id, '00000000-...'), period)`.
Index tambahan: `(period)`, `(account_id, period)`.
RLS: public read, authenticated write (sama pola dengan tabel jurnal).

### 2. Posting otomatis via trigger DB

Buat trigger `AFTER INSERT/UPDATE/DELETE` pada `journal_entry_lines` yang:
- Ambil `transaction_date` dari `journal_entries` parent → derive `period = to_char(date, 'YYYY-MM')`.
- Ambil `normal_balance` dari `coa_accounts`.
- `UPSERT` ke `account_balances`:
  - tambah/kurangi `debit_total`, `credit_total`
  - hitung ulang `ending_balance` = (normal D ? debit-credit : credit-debit) untuk baris periode itu.
- Untuk DELETE: kurangi nilainya.

Trigger berjalan otomatis di background — tidak ubah kode posting di `_app.catat-kegiatan.tsx`.

Backfill: jalankan satu kali di migration untuk mengisi `account_balances` dari data `journal_entry_lines` yang sudah ada.

### 3. Tabel baru: `report_cache`

Kolom:
- `id` uuid PK
- `report_type` text (`BS`, `PL`, `CONSOLIDATED`)
- `unit_id` uuid nullable
- `period` text (`YYYY-MM`, untuk BS = "as of"; untuk PL = "end period")
- `period_start` text nullable (untuk PL)
- `report_json` jsonb
- `generated_at` timestamptz default now()

Unique: `(report_type, COALESCE(unit_id,...), period, COALESCE(period_start,''))`.

### 4. Invalidasi cache via trigger

Trigger `AFTER INSERT/UPDATE/DELETE` pada `journal_entries`:
- Hapus baris `report_cache` di mana `period >= to_char(transaction_date,'YYYY-MM')` (semua tipe laporan; multi-unit: filter unit_id bila tersedia, sementara hapus semua).

### 5. Refactor hook saldo (`src/lib/account-balances.ts`)

Ganti implementasi `useAccountBalances(asOfDate)` & `useAccountBalancesPeriod(start,end)` agar membaca dari `account_balances`:
- `useAccountBalances(asOfDate)`: `SELECT account_id, SUM(debit_total) d, SUM(credit_total) c FROM account_balances WHERE period <= to_char(asOfDate,'YYYY-MM') GROUP BY account_id`. Kembalikan `BalanceMap` (sama signature) sehingga komponen Neraca/Laba-Rugi tidak berubah.
- `useAccountBalancesPeriod(start,end)`: filter `period BETWEEN start_month AND end_month`.

Karena signature & return shape tetap, `NeracaSheet.tsx` dan `_app.laporan.laba-rugi.tsx` tidak perlu diubah.

### 6. Cache laporan di sisi client

QueryClient TanStack Query sudah berperan sebagai cache di sesi browser (staleTime 5m). Untuk persistence lintas user, tambahkan helper `src/lib/report-cache.ts`:
- `getOrBuildReport(type, unit, period[, periodStart], builder)`:
  1. `SELECT report_json FROM report_cache WHERE ... LIMIT 1`. Jika ada → return.
  2. Jika tidak: jalankan `builder()` (yang membaca `account_balances`) → `INSERT` ke `report_cache` → return.
- Invalidasi otomatis di sisi DB (trigger di langkah 4).

Catatan: untuk iterasi ini, hook membaca `account_balances` saja sudah memenuhi target < 1 dtk untuk skala BUMDes; `report_cache` disiapkan tetapi pemakaian penuh dari `report_json` di Neraca/Laba-Rugi bisa diadopsi setelahnya tanpa mengubah API hook.

### 7. Lazy loading report tree (UI)

Tambahkan prop `defaultCollapsed` pada `NeracaSheet`:
- Di awal hanya tampilkan section header: ASET, KEWAJIBAN, EKUITAS (BS) / PENDAPATAN, BEBAN (PL) dengan baris total.
- Klik header → expand untuk menampilkan baris akun di section tersebut.
- Implementasi pakai state lokal `Set<sectionKey>` → tidak ada fetch tambahan (data sudah satu kali ambil), tapi mengurangi DOM render awal sehingga TTI cepat.

## File yang dibuat/diubah

- **Migration baru**: tabel `account_balances`, `report_cache`, indeks, RLS, trigger posting, trigger invalidasi cache, backfill awal.
- **Edit**: `src/lib/account-balances.ts` (sumber data → `account_balances`).
- **Baru**: `src/lib/report-cache.ts` (helper getOrBuildReport).
- **Edit**: `src/components/NeracaSheet.tsx` (lazy expand sections).
- **Edit**: `src/routes/_app.laporan.laba-rugi.tsx` (lazy expand sections).

## Hasil akhir

- Pembukaan Neraca & Laba Rugi membaca tabel ringkas (puluhan/ratusan baris) bukan ribuan baris jurnal.
- Posting Activity baru otomatis memperbarui `account_balances` dan menghapus cache lewat trigger DB — tanpa perubahan kode di Catat Kegiatan.
- Tampilan awal laporan ringan (hanya section), detail akun dimuat saat user expand.
- Logika Activity → Journal & struktur COA tetap utuh.
