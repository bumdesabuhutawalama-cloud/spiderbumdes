## Module USP — Unit Simpan Pinjam

Implementasi modul USP penuh dengan Activity-Based Accounting, terintegrasi dengan COA & jurnal otomatis.

### 1. Database (1 migration)

**Akun COA baru** (insert ke `coa_accounts`):
- `1.1.03.04` Piutang Pinjaman USP (ASET / DEBIT / Detail) — bila perlu pisahkan dari `1.1.03.03`
- `6.1.10.01` Beban Operasional USP (BEBAN / DEBIT / Detail)
- Akun lain sudah tersedia: Kas USP (`1.1.01.06`), Bank USP (`1.1.01.07`), Pendapatan Bunga USP (`4.1.08.02`), Pendapatan Denda USP (`4.1.08.03`)

**Unit USP** (insert ke `units`): `Unit Simpan Pinjam`, code `USP`.

**Tabel baru:**
```
loans (id, unit_id, borrower_name, principal_amount, interest_rate,
       tenure_months, start_date, monthly_installment,
       outstanding_principal, status, created_at, updated_at)

loan_installments (id, loan_id, installment_no, due_date,
                   principal_due, interest_due, total_due,
                   is_paid, paid_date, created_at)
```
RLS: read publik, write authenticated (mengikuti pola tabel lain).

### 2. Activity Cards (di `/catat-kegiatan`)

Tambah 4 kartu USP — tiap card buka dialog, submit menjalankan **satu** transaksi yang membuat `journal_entries` + `journal_entry_lines` (dan loan/installment record bila perlu) lewat `Promise.all` / RPC.

| Card | Jurnal otomatis |
|---|---|
| Pencairan Pinjaman | D Piutang Pinjaman / K Kas USP atau Bank USP. Sekaligus buat `loans` + jadwal `loan_installments` (anuitas/flat sederhana). |
| Terima Angsuran | Pilih loan aktif → input nominal & tanggal. Sistem alokasi pokok+bunga dari installment terdekat. D Kas USP / K Piutang Pinjaman (pokok) + K Pendapatan Bunga USP. Update `outstanding_principal`, tandai installment paid, set status=closed bila lunas. |
| Terima Denda | D Kas USP / K Pendapatan Denda USP. |
| Beban Operasional USP | D Beban Operasional USP / K Kas USP. |

### 3. Halaman Baru

- **`/usp` — Dashboard USP**
  - Ringkasan: Outstanding Pinjaman, Saldo Kas USP, Pendapatan Bunga (bulan ini), Pendapatan Denda (bulan ini), Laba Bersih USP.
  - Statistik: jumlah pinjaman aktif, jumlah peminjam, angsuran jatuh tempo bulan ini, overdue.
  - 10 aktivitas USP terbaru.
- **`/usp/pinjaman` — Data Pinjaman**
  - Tabel: Peminjam, Pokok, Outstanding, Angsuran/bln, Status, Jatuh Tempo Berikutnya.
  - Klik baris → detail: jadwal angsuran + riwayat pembayaran.

### 4. Sidebar

Tambah grup **Unit Simpan Pinjam** dengan child: Dashboard USP, Data Pinjaman, dan link ke Catat Kegiatan + Laporan (filter unit).

### 5. Catatan Teknis

- Tetap pakai pola activity-based existing (tidak edit core jurnal).
- Saldo & laporan tetap baca dari `journal_entry_lines` lewat `account-balances.ts` (sudah filter tanggal). Filter unit_id belum dipakai di engine balance saat ini → Dashboard USP memfilter berdasar set akun (Kas USP, Piutang Pinjaman, Pendapatan Bunga/Denda USP, Beban Operasional USP) untuk angka unit.
- Schedule angsuran: metode flat (bunga × pokok / 12) untuk kesederhanaan.
- Tidak ada manual debit/kredit di UI.

### Files

- Migration baru (akun COA + tables `loans`, `loan_installments`)
- Insert unit USP via supabase--insert
- `src/routes/_app.catat-kegiatan.tsx` — tambah 4 card + 4 dialog USP
- `src/routes/_app.usp.tsx` — layout
- `src/routes/_app.usp.index.tsx` — Dashboard USP
- `src/routes/_app.usp.pinjaman.tsx` — Data Pinjaman + detail panel
- `src/components/AppSidebar.tsx` — menu USP
