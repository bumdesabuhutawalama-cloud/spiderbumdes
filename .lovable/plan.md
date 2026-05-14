## Tujuan

Menambahkan **website publik** di depan sistem (sebagai landing utama domain) tanpa menyentuh logika akuntansi, database, autentikasi, role, atau dashboard internal yang sudah berjalan.

## Pemisahan Arsitektur

Dua layout terpisah, hidup berdampingan:

```
src/routes/
├── __root.tsx                  (tetap, hanya provider global)
│
├── _public.tsx                 (BARU) layout publik: header + footer publik
│   ├── _public.index.tsx       → /            Beranda
│   ├── _public.tentang.tsx     → /tentang     Tentang BUMDes
│   ├── _public.unit-usaha.tsx  → /unit-usaha  Unit Usaha
│   ├── _public.transparansi.tsx→ /transparansi Laporan publik (read-only)
│   └── _public.kontak.tsx      → /kontak      Kontak
│
├── login.tsx                   (TETAP, tidak diubah)
└── _app.*                      (TETAP, semua dashboard internal tidak diubah)
```

Halaman lama `_app.index.tsx` (dashboard pusat di `/`) dipindahkan rutenya ke `/dashboard` agar `/` bebas untuk landing publik. Cukup rename file → `_app.dashboard.tsx`. Redirect setelah login Admin Pusat diubah dari `to: "/"` menjadi `to: "/dashboard"` di `src/routes/login.tsx` dan guard `_app.tsx` (`PUSAT_ONLY_PREFIXES` + redirect `admin_unit`). **Tidak ada logika akuntansi/database/role yang berubah** — hanya path tujuan navigasi.

## Header Publik

Navigasi: Beranda · Tentang · Unit Usaha · Transparansi · Kontak · **[Login]** (tombol kanan, link ke `/login`).

Bila user sudah login (cek `useAuth` ringan di header), tombol berubah jadi **"Buka Dashboard"** → `/dashboard` atau `/usp` sesuai role.

## Konten Halaman (copy realistis, sentence case)

- **Beranda**: hero + tagline BUMDes, ringkasan unit usaha (card grid), CTA Login.
- **Tentang**: visi, misi, struktur singkat.
- **Unit Usaha**: card per unit (USP, dst.) dengan deskripsi.
- **Transparansi**: ringkasan laporan publik. Versi awal statis/placeholder realistis. Tidak menyentuh tabel jurnal/laporan internal.
- **Kontak**: alamat, email, form kontak (mailto, no backend).

Visual mengikuti theme existing (`CinematicBackground`, neon cyan/green, glass-card) agar konsisten.

## Performa Buka Halaman (CRITICAL)

Agar buka domain ringan & cepat:

1. **Tidak memuat AuthProvider/Supabase pada layout publik.** Auth provider tetap di `__root.tsx`, tapi pemanggilan `supabase.auth.getSession()` sudah lazy. Layout `_public.tsx` tidak menunggu `initialized` — render langsung.
2. **Preload via TanStack Router**: `<Link preload="intent">` antar halaman publik (sudah default `intent` di `router.tsx`).
3. **Tidak import komponen berat** (chart, sheet, dialog) di route publik. Hanya komponen presentasi statis.
4. **Gambar**: gunakan ukuran kecil + `loading="lazy"` untuk gambar non-hero.
5. **SEO/SSR**: setiap route publik punya `head()` sendiri (title, description, og:title, og:description) — sudah didukung TanStack Start.
6. **Tidak ada query React Query di landing** — murni statik agar TTFB cepat.

## Yang TIDAK Diubah (jaminan)

- Skema database, RLS, migrations.
- Service layer: `journal-correction.ts`, `account-balances.ts`, `ledger.ts`, `report-cache.ts`, `users.functions.ts`.
- Semua route `_app.*` (dashboard, USP, laporan, jurnal koreksi, pengaturan).
- `AuthProvider`, `use-auth.ts`, `auth-middleware.ts`, `auth-attacher.ts`.
- Role logic (`admin_pusat`, `admin_unit`).
- Komponen internal: `AppSidebar`, `UspNav`, `usp-dialogs`, dst.

## File yang Dibuat / Diedit

**Baru:**
- `src/routes/_public.tsx` (layout + header + footer publik)
- `src/routes/_public.index.tsx` (Beranda)
- `src/routes/_public.tentang.tsx`
- `src/routes/_public.unit-usaha.tsx`
- `src/routes/_public.transparansi.tsx`
- `src/routes/_public.kontak.tsx`
- `src/components/public/PublicHeader.tsx`
- `src/components/public/PublicFooter.tsx`

**Rename:**
- `src/routes/_app.index.tsx` → `src/routes/_app.dashboard.tsx`

**Edit minor (hanya path redirect):**
- `src/routes/login.tsx`: `navigate({ to: "/" })` → `navigate({ to: "/dashboard" })` untuk admin_pusat.
- `src/routes/_app.tsx`: update `PUSAT_ONLY_PREFIXES` (tambah `/dashboard`) dan redirect root admin_unit ke `/usp` (sudah ada).

`routeTree.gen.ts` regen otomatis.

## Hasil

- Domain dibuka → langsung lihat website publik yang ringan & cepat.
- Klik **Login** → halaman login existing → masuk ke dashboard sesuai role (tidak ada perubahan UX setelah login).
- Arsitektur internal sistem akuntansi 100% tidak tersentuh.
