## Tujuan

Mengganti seluruh form "Catat Kegiatan" yang saat ini muncul sebagai modal/bottom-sheet menjadi **halaman penuh dengan route sendiri**. Halaman /usp/kegiatan tetap menjadi hub kartu pemilihan, tapi klik kartu akan **navigate** ke route form (bukan membuka overlay).

Manfaat:
- Tidak ada masalah scroll mentok di bottom-sheet (form bisa scroll natural di page).
- Bisa di-bookmark, refresh, dan back-button browser bekerja normal.
- Mobile-friendly: form jadi 1 layar penuh, ramah jempol.
- SSR/SEO friendly, tidak ada dashboard bocor di belakang form.

## Struktur Route Baru

Saya usulkan pakai sub-route konsisten di bawah `/usp/kegiatan/...` agar breadcrumb dan UspNav tetap rapi (alternatif `/operasional/pengeluaran` membuat hirarki pecah). Mapping:

```text
/usp/kegiatan                       -> daftar kartu (sudah ada)
/usp/kegiatan/penyertaan-modal      -> Penyertaan Modal
/usp/kegiatan/belanja-aset          -> Belanja Aset / Modal
/usp/kegiatan/penerimaan-kas        -> Penerimaan Kas
/usp/kegiatan/pengeluaran           -> Pengeluaran Operasional
/usp/kegiatan/pencairan             -> Pencairan Pinjaman USP
/usp/kegiatan/angsuran              -> Terima Angsuran USP
/usp/kegiatan/denda                 -> Terima Denda USP
/usp/kegiatan/beban                 -> Beban Operasional USP
```

Layout: setiap halaman pakai `PageHeader` + tombol "Kembali ke Catat Kegiatan", lalu form di dalam container `glass-card` yang flow natural di page (bukan `fixed inset-0`).

## Yang Akan Diubah

### 1. Halaman hub `/usp/kegiatan`
- Hapus semua state `openXxx` dan render dialog.
- Ubah `ActivityCard` menjadi `<Link>` ke route masing-masing (preload `intent`).
- Tetap pakai grid kartu yang sudah ada.

### 2. Komponen form (refactor, bukan rewrite)
- File `src/components/usp-dialogs.tsx` -> rename konseptual menjadi form sections. Hapus komponen `Shell` (yang `fixed inset-0`). Ganti dengan komponen `FormPage` baru di `src/components/activity-form-page.tsx` yang:
  - Render header + deskripsi
  - Render form children dengan padding normal (bukan overlay)
  - Tombol "Batal" -> navigate kembali ke `/usp/kegiatan` (pakai `useNavigate`)
  - Setelah sukses simpan -> navigate kembali + toast sukses
- 4 form yang berada inline di `_app.usp.kegiatan.tsx` (PenyertaanModal, BelanjaAset, PenerimaanKas, PengeluaranOperasional) dipindah ke file modul masing-masing di `src/components/activities/` agar tidak menumpuk dan hub jadi ringan.

### 3. File route baru (8 file)
Setiap file ikut pola minimal:
```tsx
export const Route = createFileRoute("/_app/usp/kegiatan/pencairan")({
  head: () => ({ meta: [{ title: "Pencairan Pinjaman USP · BUMDes" }] }),
  component: PencairanPage,
});
```
Tiap component memanggil form section yang sudah di-extract, dengan `onClose` diganti menjadi handler navigate kembali.

### 4. Layout `_app.usp.kegiatan.tsx` perlu `<Outlet />`
Karena sekarang ada child routes, file `_app.usp.kegiatan.tsx` jadi layout route. Solusi paling sederhana:
- Rename file lama berisi grid kartu menjadi `_app.usp.kegiatan.index.tsx`.
- Buat `_app.usp.kegiatan.tsx` baru sebagai layout tipis: `() => <Outlet />`.

### 5. Pembersihan
- Hapus prop `onClose` pada form yang sudah jadi page.
- Hapus import dialog yang tidak terpakai.
- Tidak ada perubahan logika bisnis akuntansi (mutation, schedule, journal lines tetap sama persis).

## Detail Teknis

- Pakai `useNavigate({ from: Route.fullPath })` untuk back-navigation.
- Form scroll memakai scroll natural halaman (sudah ditangani layout `_app.tsx`), tidak perlu `max-h-[96vh] overflow-y-auto` lagi.
- Pertahankan semua RLS, mutation, dan auto-journaling — hanya pembungkus UI yang berubah.
- Type-safety: route baru otomatis di-generate `routeTree.gen.ts` oleh Vite plugin saat dev.

## Yang TIDAK Berubah

- Skema database, RLS, fungsi `has_role`, `is_pusat`, dsb.
- Logika perhitungan jadwal angsuran, alokasi bunga/pokok, posting jurnal.
- Halaman lain (Dashboard, Pinjaman, Transfer, Laporan).
- Branding & sidebar.

## Hasil Akhir

- Klik kartu di `/usp/kegiatan` -> berpindah ke halaman form, dashboard tidak terlihat di belakang.
- Form bisa di-scroll sampai habis, tombol Simpan/Batal selalu tercapai.
- Back browser kembali ke daftar kartu.
