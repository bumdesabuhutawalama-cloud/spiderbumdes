## Modul Fixed Asset (Aset Tetap)

Tujuan: aset muncul **otomatis** dari jurnal (single source of truth), bukan input manual. Lalu user bisa menjalankan penyusutan bulanan → membentuk jurnal otomatis.

---

### 1. Database (migrasi Supabase)

**`coa_accounts` — tambah 3 flag:**
- `is_fixed_asset boolean default false`
- `is_accumulated_depreciation boolean default false`
- `is_depreciation_expense boolean default false`

Lalu tandai akun yang ada:
- `1.3.01.01` Tanah, `1.3.02.01` Kendaraan, `1.3.03.01` Peralatan & Mesin, `1.3.04.01` Meubelair, `1.3.05.01` Gedung & Bangunan, `1.3.06.01` Aset Lainnya → `is_fixed_asset = true`
- Akun "Akumulasi Penyusutan ..." → `is_accumulated_depreciation = true`
- Akun "Beban Penyusutan ..." → `is_depreciation_expense = true`

(Akan diverifikasi via query COA dulu, lalu seed mapping default per kategori aset.)

**Tabel `fixed_assets`:**
id, unit_id (nullable, ikut jurnal), asset_name, acquisition_date, acquisition_cost, useful_life_years (default per kategori: tanah 0 = tidak disusutkan, bangunan 20, kendaraan 8, peralatan 4, meubelair 4, lainnya 5), depreciation_method default `straight_line`, coa_asset_id, coa_accumulated_depr_id, coa_depr_expense_id, accumulated_depreciation default 0, book_value, last_depreciation_date, status (`ACTIVE`/`FULLY_DEPRECIATED`), created_from_journal_id, created_at, updated_at.

**Tabel `fixed_asset_depreciation_history`:**
id, asset_id, period_month, period_year, depreciation_amount, journal_id, created_at. Unique (asset_id, period_year, period_month).

**RLS:** pusat full, unit_admin scoped via `unit_id` (sama pola seperti journal_entries).

**Trigger `tg_journal_lines_auto_create_asset`** (AFTER INSERT pada `journal_entry_lines`):
- Jika `debit > 0` dan akun punya `is_fixed_asset = true`
- Lookup mapping akumulasi & beban penyusutan untuk kategori aset tsb (via tabel mapping `fixed_asset_coa_mapping(coa_asset_id, coa_accumulated_depr_id, coa_depr_expense_id, default_useful_life)`)
- Insert ke `fixed_assets` dengan acquisition_date = `journal_entries.transaction_date`, cost = debit, status ACTIVE, book_value = cost.
- asset_name default = `coa_accounts.account_name` + " — " + journal description.

### 2. Server functions (`src/lib/fixed-assets.functions.ts`)
- `listFixedAssets({ unitCode? })`
- `runDepreciation({ period: 'YYYY-MM', unitCode? })` — untuk tiap aset ACTIVE dgn useful_life > 0 & belum disusutkan periode tsb: hitung monthly = cost / (life*12), buat journal_entry (debit beban, credit akumulasi) via insert ke `journal_entries` + `journal_entry_lines` (trigger ledger sudah otomatis), insert history, update aset. Pakai `requireSupabaseAuth`.
- `updateAssetMeta({ id, asset_name?, useful_life_years? })` — hanya metadata, bukan cost.

### 3. UI

**Sidebar:** tambah menu "Aset Tetap" di section Pusat, Dagang, USP → `/aset`, `/dagang/aset`, `/usp/aset`.

**Route `_app.aset.tsx` (komponen reusable `FixedAssetsPage` dgn prop `fixedUnitCode`)**:
- Header + tombol **"Jalankan Penyusutan Bulan Ini"** (modal konfirmasi periode).
- Tabel aset: Nama · Tanggal Perolehan · Harga Perolehan · Umur · Penyusutan/bln · Akumulasi · Nilai Buku · Status · Aksi (edit nama/umur, lihat history).
- Per baris simulasi realtime (monthly, yearly, accumulated to-date, book value).
- Banner: "Aset dibuat otomatis dari jurnal pembelian aset. Tidak ada input manual."
- Empty state mengarahkan ke menu Belanja Aset.

**Wrapper routes:**
- `_app.dagang.aset.tsx` → `<FixedAssetsPage fixedUnitCode="DAGANG" />`
- `_app.usp.aset.tsx` → `<FixedAssetsPage fixedUnitCode="USP" />`

### 4. Cache invalidation
Tambahkan `fixed_assets` & `fixed_asset_depreciation_history` ke `FINANCIAL_KEYS` di `src/lib/query-invalidate.ts` agar refetch otomatis saat jurnal tersimpan (juga ketika Belanja Aset submit, aset langsung muncul tanpa refresh).

### 5. Yang TIDAK diubah
- Form Belanja Aset existing (sudah membentuk jurnal yang benar — trigger DB yang menangkapnya).
- COA struktur, jurnal existing, laporan lain.
- Logika neraca / laba rugi / bagi hasil.

---

### Catatan teknis
- Penyusutan = `straight_line` only di iterasi pertama.
- Tanah (useful_life = 0) tidak disusutkan, status tetap ACTIVE.
- `runDepreciation` idempoten via unique (asset, year, month).
- Jika mapping akumulasi/beban belum ada untuk suatu kategori aset, trigger tetap insert aset dengan `coa_accumulated_depr_id`/`coa_depr_expense_id` NULL → UI menandai "perlu mapping" dan tombol susut akan skip aset tsb dengan pesan jelas.

Setelah plan disetujui, saya jalankan migrasi dulu, lalu tulis server functions + UI dalam batch paralel.