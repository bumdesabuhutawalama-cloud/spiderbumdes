## Tujuan

Mengganti semua nilai placeholder `XXX` di laporan **Neraca Pusat**, **Neraca Konsolidasi**, dan **Laba Rugi** dengan saldo riil yang dihitung otomatis dari jurnal yang terbentuk di **Catat Kegiatan** (tabel `journal_entries` + `journal_entry_lines`).

Setiap kali user mencatat kegiatan (mis. Penyertaan Modal), laporan akan langsung memperlihatkan dampaknya — tanpa input manual.

## Pendekatan

### 1. Helper saldo akun (baru)

Buat `src/lib/account-balances.ts` berisi:

- `useAccountBalances(asOfDate?)` — hook React Query yang:
  - Mengambil semua `journal_entry_lines` join `journal_entries` (filter `transaction_date <= asOfDate`).
  - Mengembalikan `Map<account_id, { debit, credit, balance }>`.
  - `balance` dihitung sesuai `normal_balance` akun:
    - Akun normal **Debit** (Aset, Beban): `debit − credit`
    - Akun normal **Kredit** (Kewajiban, Ekuitas, Pendapatan): `credit − debit`
- `useAccountBalancesPeriod(start, end)` — varian untuk Laba Rugi (filter rentang tanggal).
- `rollupHeader(accounts, balances)` — menjumlahkan saldo anak ke akun **Header** berdasarkan prefix kode (mis. `1.1.01` mendapat total dari semua `1.1.01.xx`).
- `formatRp(n)` dan `formatRpOrDash(n)` (angka 0 tampil sebagai `-`).

QueryKey: `["balances", asOfDate]` agar otomatis di-invalidate saat user simpan kegiatan baru (Catat Kegiatan akan memanggil `queryClient.invalidateQueries({ queryKey: ["balances"] })`).

### 2. Neraca Pusat & Neraca Konsolidasi

Pada `_app.laporan.neraca-pusat.tsx` dan `_app.laporan.neraca-konsolidasi.tsx`:

- Ambil saldo via `useAccountBalances(asOfDate)`.
- Tambahkan **Laba Tahun Berjalan** ke bagian Ekuitas:
  - Hitung: `Σ saldo akun tipe PENDAPATAN − Σ saldo akun tipe BEBAN` (dari awal hingga `asOfDate`).
  - Tampilkan sebagai baris tambahan di section EKUITAS.
- Ganti kolom `20X2` → saldo per `asOfDate` (default akhir tahun berjalan).
- Ganti kolom `20X1` → saldo per akhir tahun sebelumnya (tahun-1 dari `asOfDate`).
- Hitung & isi `TOTAL ASET`, `TOTAL KEWAJIBAN`, `TOTAL EKUITAS`, dan `TOTAL KEWAJIBAN DAN EKUITAS`.
- Saldo `0` ditampilkan `-` agar laporan rapi.
- Tanggal di header laporan mengikuti input date.

Catatan multi-unit: skema `journal_entries` saat ini belum punya kolom `unit_id`, jadi Neraca Pusat dan Neraca Konsolidasi sementara menampilkan dataset jurnal yang sama. Ini sudah konsisten dengan kondisi data sekarang; pemisahan per-unit dapat ditambahkan saat kolom unit diperkenalkan.

### 3. Laba Rugi

Refactor `_app.laporan.laba-rugi.tsx` (saat ini pakai `ReportPage` dengan baris hard-coded):

- Ubah menjadi komponen sendiri (mirip pola Neraca) dengan tanggal mulai & akhir.
- Ambil akun dengan `type IN ('PENDAPATAN', 'BEBAN')` dari COA, urut kode.
- Saldo per akun = `useAccountBalancesPeriod(start, end)`.
- Section: **PENDAPATAN**, **BEBAN**, lalu baris **LABA / (RUGI) BERSIH** = Total Pendapatan − Total Beban.
- Kolom: `Periode Ini` (rentang dipilih) dan `Periode Lalu` (rentang yang sama tahun sebelumnya).
- Gaya visual mengikuti Neraca (sheet cream, header merah) agar konsisten.

### 4. Invalidasi cache setelah simpan kegiatan

Pada handler simpan di `_app.catat-kegiatan.tsx` (mutation Penyertaan Modal):

- Setelah `insert` sukses, panggil `queryClient.invalidateQueries({ queryKey: ["balances"] })` agar laporan langsung refresh tanpa reload.

### 5. Dashboard (opsional, lanjutan singkat)

Jika nilai-nilai di Dashboard (Kas, Laba berjalan) memakai placeholder, hubungkan juga dengan helper yang sama agar konsisten. Akan dilakukan hanya jika sudah ada komponen yang menampilkannya — tidak menambah fitur baru.

## File yang akan dibuat/diubah

- **Baru**: `src/lib/account-balances.ts`
- **Edit**: `src/routes/_app.laporan.neraca-pusat.tsx`
- **Edit**: `src/routes/_app.laporan.neraca-konsolidasi.tsx`
- **Rewrite**: `src/routes/_app.laporan.laba-rugi.tsx`
- **Edit**: `src/routes/_app.catat-kegiatan.tsx` (tambah invalidate `["balances"]` setelah simpan)

## Hasil akhir

User mencatat “Penyertaan Modal Rp 10.000.000” → buka Neraca → akun **Kas/Bank** dan **Modal Disetor** otomatis berisi `Rp 10.000.000`, `TOTAL ASET = TOTAL KEWAJIBAN + EKUITAS`. Buka Laba Rugi → bila ada transaksi pendapatan/beban, laba bersih ikut terhitung. Tidak ada lagi `XXX` di laporan.