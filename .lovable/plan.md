
# Refactor: Modularisasi Unit Pusat & Unit Simpan Pinjam

Tujuannya adalah memisahkan secara visual dan struktural antara **Unit Pusat** dan **Unit Simpan Pinjam (USP)**. Semua jurnal, RK, laporan, dan schema database tetap utuh — hanya routing, sidebar, dan layout yang berubah.

## 1. Struktur Sidebar Baru

Sidebar utama disederhanakan menjadi 5 item milik Unit Pusat:

- Dashboard Pusat (`/`)
- Bagan Akun / COA (`/coa`)
- Laporan Pusat (group: Neraca Pusat, Neraca Konsolidasi, Laba Rugi, Bagi Hasil, Rekonsiliasi RK)
- Unit Simpan Pinjam (`/usp`) — masuk modul terpisah
- Pengaturan (`/pengaturan`)

Menu yang dipindahkan ke dalam modul USP:
- Catat Kegiatan (saat ini transaksi USP utama)
- Transfer Antar Entitas
- Data Pinjaman
- Dashboard USP
- Rekonsiliasi RK USP (link kontekstual)

Catatan: saat ini "Catat Kegiatan" dan "Transfer Antar Entitas" berada di sidebar utama. Akan dipindah ke sub-navigasi USP. Jika user juga ingin tetap dapat diakses dari Pusat, beri tahu — default rencana ini memindahkannya ke USP.

## 2. Struktur Routing Baru

```
src/routes/
  __root.tsx
  _app.tsx                       (layout Unit Pusat — sidebar utama)
  _app.index.tsx                 (Dashboard Pusat)
  _app.coa.tsx
  _app.pengaturan.tsx
  _app.laporan.*.tsx             (laporan pusat, tetap)
  _usp.tsx                       (NEW — layout modul USP, sidebar/nav internal)
  _usp.index.tsx                 (NEW — landing/dashboard USP, redirect ke /usp/dashboard)
  _usp.dashboard.tsx             (rename dari _app.usp.tsx)
  _usp.pinjaman.tsx              (rename dari _app.usp.pinjaman.tsx)
  _usp.kegiatan.tsx              (rename dari _app.catat-kegiatan.tsx, scope ke unit USP)
  _usp.transfer.tsx              (rename dari _app.transfer-antar-entitas.tsx)
  _usp.laporan.tsx               (NEW — index laporan unit USP, link ke neraca unit, dsb)
```

Route-level code splitting otomatis berlaku via TanStack Router (komponen masing-masing route adalah chunk terpisah). Tidak perlu `React.lazy` manual.

Redirect backward-compatible:
- `/catat-kegiatan` → `/usp/kegiatan`
- `/transfer-antar-entitas` → `/usp/transfer`
- `/usp/pinjaman` tetap valid (sama path)

## 3. Layout USP Terpisah

`src/routes/_usp.tsx` adalah pathless layout route dengan:
- Header + breadcrumb: **Unit Pusat / Unit Simpan Pinjam / {sub}**
- Sidebar/tab internal USP: Dashboard, Pinjaman, Catat Kegiatan, Transfer, Laporan
- Tombol "Kembali ke Unit Pusat" → `/`
- Reuse `CinematicBackground` agar visual konsisten

Komponen baru:
- `src/modules/usp/UspLayout.tsx`
- `src/modules/usp/UspSidebar.tsx`
- `src/modules/pusat/PusatSidebar.tsx` (refactor dari `AppSidebar.tsx`)

Struktur folder modular:
```
src/modules/
  pusat/
    components/    (PusatSidebar, dsb)
  usp/
    components/    (UspLayout, UspSidebar, UspBreadcrumb)
    pages/         (re-export halaman jika perlu agar route file tipis)
```

Halaman existing (laporan, COA, dst) tetap di `src/routes/` — tidak dipindah agar tidak menyentuh business logic.

## 4. Performa

- Route-based code splitting otomatis (TanStack auto split).
- React Query cache global yang sudah ada (`staleTime 5m`) tetap dipakai → tidak ada refetch saat pindah modul.
- Memoisasi tabel besar (Pinjaman) dengan `useMemo` untuk row data.
- Hindari unmount provider — `__root.tsx` tetap host `QueryClientProvider`.
- Breadcrumb & sidebar USP pakai `Link` TanStack (preload `intent`).

## 5. Keamanan / Akses

Saat ini app belum punya auth/roles aktif. Rencana minimum yang aman tanpa rewrite:
- Tambah hook `useUspAccess()` placeholder yang return `true` (siap diganti saat auth diaktifkan).
- `_usp.tsx` `beforeLoad` cek `useUspAccess`; jika false → `redirect({ to: "/" })`.
- Sidebar utama menyembunyikan link USP jika tidak punya akses.
- Catatan: untuk validasi API yang sebenarnya butuh roles tabel + RLS — tidak dilakukan di refactor ini (di luar scope, akan dibahas terpisah jika user mau enable auth).

## 6. Backward Compatibility

- Tidak ada migration DB.
- Tidak ada perubahan pada `account-balances.ts`, `bagi-hasil`, RK, jurnal, atau Supabase schema.
- Route lama diberi redirect agar bookmark user tetap berfungsi.
- Semua data & laporan sebelum/ sesudah refactor identik.

## 7. Risiko & Klarifikasi

Sebelum eksekusi, satu hal perlu user konfirmasi:
1. **Catat Kegiatan & Transfer Antar Entitas** — saat ini berada di sidebar utama dan bisa dipakai untuk transaksi pusat juga. Rencana ini memindahnya ke modul USP. Jika user butuh keduanya tetap dapat diakses dari Unit Pusat juga, kita bisa duplikasi link (route tunggal, link di kedua sidebar). Default: **dipindah penuh ke USP** sesuai instruksi.

## 8. Tahapan Implementasi

1. Buat folder `src/modules/pusat` dan `src/modules/usp`.
2. Refactor `AppSidebar.tsx` → `PusatSidebar.tsx`, hapus item USP yang dipindah, sisakan struktur baru.
3. Buat `_usp.tsx` (layout) + `UspSidebar`, `UspLayout`, breadcrumb.
4. Rename route files:
   - `_app.usp.tsx` → `_usp.dashboard.tsx`
   - `_app.usp.pinjaman.tsx` → `_usp.pinjaman.tsx`
   - `_app.catat-kegiatan.tsx` → `_usp.kegiatan.tsx`
   - `_app.transfer-antar-entitas.tsx` → `_usp.transfer.tsx`
5. Tambah route redirect di file lama (atau rename + buat stub route redirect).
6. Tambah `_usp.index.tsx` (redirect ke `/usp/dashboard`) & `_usp.laporan.tsx` (link kontekstual).
7. Update semua `<Link to="...">` internal yang menunjuk path lama.
8. Verifikasi build & navigasi di preview.

Selesai — tidak ada perubahan business logic, schema, atau jurnal.
