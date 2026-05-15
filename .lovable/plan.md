## Akar Masalah

Setelah memeriksa database & kode, neraca tidak seimbang **bukan karena jurnal HPP/persediaan tidak terbentuk** — jurnalnya sudah benar:

```
DAGANG_PENJUALAN_TUNAI:
  Dr Kas Unit Perdagangan      500.000
  Cr Pendapatan Penjualan      500.000
  Dr HPP Barang Dagangan       400.000
  Cr Persediaan                400.000
```

Persediaan turun dari 4jt → 3.6jt (✓), Kas 6.5jt (✓). Yang salah adalah **perhitungan "Laba Tahun Berjalan" pada NeracaSheet**, karena dua bug data/COA:

1. **Akun `4.2.01.00 Pendapatan Penjualan` & `5.1.01.00 HPP` ditandai `entry_type = "Header"` padahal tidak punya akun anak.** Di `computeSignedBalances`, nilai header selalu di-overwrite oleh hasil rollup anak (prefix `4.2.01.00.`), yang nilainya 0 karena tidak ada anak. Akibatnya saldo Pendapatan & HPP terbaca 0 saat dijumlahkan via `sumByType`.
2. **Akun HPP bertipe `"HPP"`, bukan `"BEBAN"`.** NeracaSheet hanya menjumlahkan `PENDAPATAN` − `BEBAN`, jadi HPP tidak pernah ikut bahkan jika header-nya benar. (Selain itu tipe `BEBAN_LAIN` & `PENDAPATAN_LAIN` juga ada di COA tapi diabaikan.)

Hasilnya `labaCur` selalu 0 → Total Ekuitas tidak menerima 100.000 laba berjalan → selisih 100.000.

**Catatan penting:** sesuai instruksi, kita TIDAK menyentuh struktur COA, jurnal yang sudah ada, atau alur transaksi. Perbaikan dilakukan murni di sisi perhitungan tampilan NeracaSheet agar tahan terhadap quirk COA seperti di atas.

## Perubahan

### `src/components/NeracaSheet.tsx`

Hitung Laba/(Rugi) Tahun Berjalan langsung dari **saldo mentah jurnal** (`BalanceMap` yang sudah ada dari `useAccountBalances`), tanpa lewat rollup header dan tanpa terbatas pada tipe `BEBAN`:

1. Ubah query `coa_accounts` (`accountsRaw`) agar `.in("type", [...])` juga mencakup `"HPP"`, `"BEBAN_LAIN"`, `"PENDAPATAN_LAIN"`. Ini hanya menambah akun yang di-fetch — tidak mengubah COA.
2. Ganti perhitungan `labaCur` / `labaPrev` di blok `useMemo`:
   - Iterasi langsung tiap akun bertipe income/expense (`PENDAPATAN`, `PENDAPATAN_LAIN`, `BEBAN`, `BEBAN_LAIN`, `HPP`) — termasuk yang bertanda `entry_type === "Header"`.
   - Untuk tiap akun ambil `raw = balCur.get(a.id)`; pendapatan = `credit - debit`, beban/HPP = `debit - credit`.
   - `labaCur = totalPendapatan − totalBebanPlusHpp`. Sama untuk `labaPrev`.
   - Karena memakai raw balance per akun (bukan rollup prefix), bug header-tanpa-anak tidak relevan lagi.
3. Pastikan baris **"ASET / KEWAJIBAN / EKUITAS"** tetap menggunakan `neracaAccounts` & `sumByType` seperti sekarang (tidak diubah). Hanya nilai `labaCur` / `labaPrev` yang sudah dipakai di seksi EKUITAS dan baris validasi `diff` yang ikut sinkron otomatis karena memakai variabel yang sama.
4. Tidak ada perubahan pada `account-balances.ts`, `report-cache.ts`, jurnal, COA, RLS, atau halaman Laba Rugi.

## Verifikasi

Setelah perubahan, pada skenario user:

```
Total Aset           = 10.100.000
Total Kewajiban      = 0
Ekuitas RK Pusat     = 10.000.000
Laba Tahun Berjalan  =    100.000   ← sebelumnya 0
Total Ekuitas        = 10.100.000
Aset = Kewajiban + Ekuitas → seimbang (banner hijau)
```

Skenario tanpa penjualan / hanya transfer modal: `labaCur = 0` (tidak berubah dari sebelumnya), neraca tetap seimbang.

## Tidak Disentuh

- Logika akuntansi & template jurnal (`dagang-activities.tsx`, dst.)
- Struktur COA, tipe akun, normal_balance, entry_type
- `account-balances.ts`, `report-cache.ts`
- Halaman Laba Rugi (perbedaan tipe BEBAN vs HPP di Laba Rugi adalah isu terpisah; di luar scope perbaikan ini)
