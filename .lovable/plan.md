
# Redesign UI/UX Premium — BUMDes Inovasi Desa

Tujuan: mengubah seluruh tampilan (landing, public pages, login, dashboard internal) menjadi clean modern fintech / government style — putih premium dengan aksen navy & soft blue, glassmorphism ringan, kartu rounded, shadow halus. **Tidak ada perubahan pada logika akuntansi, database, API, autentikasi, role, transaksi, atau routing.**

---

## 1. Design System Foundation (`src/styles.css`)

Refactor token agar SATU sistem visual dipakai di semua halaman (landing + dashboard).

- **Tema utama**: light premium (putih) sebagai default; aksen navy gradient. Tetap pertahankan token lama (neon-cyan/green) sebagai legacy supaya komponen existing tidak pecah, tapi semua surface utama beralih ke palet baru.
- **Token baru** (di-extend dari brand tokens yang sudah ada):
  - `--bg-app`: `#F4F7FC` (soft blue background)
  - `--bg-app-gradient`: `linear-gradient(180deg, #FFFFFF 0%, #EEF3FB 60%, #E2EAF7 100%)`
  - `--surface`: `#FFFFFF`
  - `--surface-glass`: `rgba(255,255,255,0.72)` + backdrop-blur
  - `--navy-900` `#0B1F44`, `--navy-700` `#0F2A5F`, `--navy-500` `#1E4FA3`, `--blue-400` `#2F6FED`, `--blue-50` `#F0F4FF`
  - `--border-soft` `#E6ECF5`, `--text` `#0B1F44`, `--text-muted` `#6B7A99`
  - Shadows: `--shadow-sm` `0 4px 12px rgba(15,42,95,.06)`, `--shadow-md` `0 10px 30px rgba(15,42,95,.08)`, `--shadow-lg` `0 20px 40px rgba(15,42,95,.10)`, `--glow-blue` `0 0 32px rgba(47,111,237,.18)`.
  - Gradient: `--grad-hero` `linear-gradient(135deg,#FFFFFF 0%,#EAF1FB 50%,#0F2A5F 140%)`, `--grad-navy` `linear-gradient(135deg,#1E4FA3,#0F2A5F)`.
- **Typography**: Inter (body) + Poppins (display). Tambah `@import` Google Fonts dan ganti `--font-sans` & `--font-display`.
- **Utility classes baru** (reusable di landing & dashboard):
  - `.surface-card` (rounded-2xl, border tipis, shadow-md, hover translateY -2px)
  - `.surface-glass` (rgba white + backdrop-blur + border 1px #E6ECF5)
  - `.stat-card` (variant surface-card dengan icon-badge & angka besar)
  - `.table-modern` (header soft, row hover #F7F9FD, border #E6ECF5)
  - `.btn-primary` (gradient navy + shadow), `.btn-ghost`, `.btn-outline`
  - `.input-modern` (sudah ada `.input-soft` — extend)
  - `.section-soft` (background `--bg-app`), `.hero-gradient`
- Animations halus: fade-in-up, hover-lift (sudah ada — pertahankan).

---

## 2. Public Website (landing & sub-pages)

File: `src/routes/_public.tsx`, `_public.index.tsx`, `_public.tentang.tsx`, `_public.unit-usaha.tsx`, `_public.transparansi.tsx`, `_public.kontak.tsx`, plus `src/components/public/PublicHeader.tsx`, `PublicFooter.tsx`.

- **Background**: ganti `CinematicBackground` (dark) di layout public dengan background light premium (gradient putih → soft blue + subtle grid / blob). Buat komponen baru `PublicBackground` agar dashboard tetap pakai cinematic dark jika diinginkan — tapi lihat poin 4.
- **PublicHeader**: putih glass (`bg-white/80 backdrop-blur` + border bawah `#E6ECF5`), logo + brand navy, link nav text-navy, tombol Login `.btn-primary` gradient navy. Hamburger mobile tetap, panel jadi white glass.
- **PublicFooter**: putih dengan border atas tipis, teks navy/muted.
- **Beranda**: hero besar — heading Poppins 56px navy, sub-copy muted, dua CTA (`Login` primary + `Pelajari` ghost), ilustrasi/mockup card kanan. Section: fitur (3 stat-card), unit usaha preview, transparansi highlight, CTA akhir.
- **Tentang / Unit Usaha / Transparansi / Kontak**: semua section pakai `.section-soft` + `.surface-card` + `.icon-badge`. Konten copy existing dipertahankan.
- **Login (`src/routes/login.tsx` & `login.$unit.tsx`)**: split-screen — kiri panel gradient navy dengan tagline & logo, kanan form `.form-card` putih dengan input `.input-modern` & button `.btn-primary`. Tetap pakai logika auth existing.

---

## 3. Dashboard Internal — Visual Refresh (logika utuh)

File: `src/components/DashboardLayout.tsx`, `AppSidebar.tsx`, `StatCard.tsx`, `CinematicBackground.tsx` (jadi opsional), shadcn `card.tsx`, `button.tsx`, `input.tsx`, `table.tsx` (override class-nya minimal lewat tokens), plus halaman `_app.dashboard.tsx`, `_app.laporan-pusat.tsx`, semua `_app.usp.*`, dll.

Strategi: **ganti tema dashboard dari dark cinematic → light premium** agar konsisten dengan landing.

- **Background**: ganti `CinematicBackground` di `DashboardLayout` jadi `AppBackground` baru (gradient putih → soft blue + subtle grid). Komponen lama tetap ada (tidak dihapus) supaya tidak memecah import.
- **Sidebar (`AppSidebar.tsx`)**: putih glass, border kanan `#E6ECF5`, item aktif gradient navy + text putih, item idle text navy-muted, hover bg `#F0F4FF`. Mobile sidebar mengikuti.
- **Header**: putih glass, search bar `.input-modern`, avatar tetap, badge notifikasi navy.
- **PageHeader**: title Poppins navy, eyebrow `Admin Pusat` warna `--blue-400`.
- **StatCard**: rewrite jadi `.surface-card` putih, icon-badge soft blue, angka navy besar, delta hijau/red kecil, hover-lift.
- **Card / Table / Form**: semua section pakai `.surface-card` + `.table-modern`. Override token `--card`, `--background`, `--border`, `--input`, `--foreground`, `--muted-foreground`, `--primary` ke palet baru sehingga seluruh komponen shadcn (Card/Button/Input/Select/Tabs/Dialog/dll) otomatis ikut tema baru tanpa edit per-file.
- **Buttons**: variant `default` shadcn dipetakan ke gradient navy via token `--primary` & `--primary-foreground` putih.
- **Charts** (jika ada di reports): warna seri pakai `--navy-700`, `--blue-400`, `--blue-50`.
- **JournalCorrectionWizard, BukuBesarSheet, NeracaSheet, ReportPage**: hanya ganti class container ke `.surface-card`, tabel ke `.table-modern`. Logika & data tetap.

---

## 4. Konsistensi & Tema Tunggal

- Pilih **light premium sebagai tema tunggal** untuk landing + dashboard (sesuai brief: putih → navy/biru tua, fintech/government). `CinematicBackground` lama tetap ada di repo tapi tidak dipakai di layout utama (tidak dihapus untuk hindari risiko import error).
- Token legacy (`--neon-cyan`, `--neon-green`, `.glass-card`, `.glow-cyan`, dst) dipertahankan dan di-remap ke palet biru baru, jadi komponen yang masih merefer ke kelas itu tetap render selaras (tidak ada visual nyasar).

---

## 5. Responsiveness & Performance

- Semua container utama: `max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8`.
- Pastikan tidak ada `overflow-x` di body; tabel panjang dibungkus `overflow-x-auto` di dalam `.surface-card`.
- Hamburger mobile sudah ada — disesuaikan warna baru.
- Hindari gambar berat di hero; pakai SVG/gradient.

---

## 6. Yang TIDAK Disentuh

- `src/lib/journal-correction.ts`, `src/lib/ledger.ts`, `account-balances.ts`, semua `*.functions.ts`, `auth-*`, RLS, migrasi DB.
- File auto-generated: `routeTree.gen.ts`, `integrations/supabase/*`.
- Semua file di `_app.usp.kegiatan.*` — hanya class wrapper yang berubah, form & submit handler tetap.
- Routing, role gating di `_app.tsx`, redirect login.

---

## Technical Notes

- Edit terpusat di `src/styles.css` (token + utilities) memberi efek paling besar dengan risiko paling kecil. Komponen shadcn membaca variabel CSS, jadi mengganti `--background`, `--card`, `--primary`, `--border`, `--foreground`, `--muted-foreground` otomatis menyebar.
- Komponen yang perlu rewrite struktural: `PublicHeader`, `PublicFooter`, `DashboardLayout` (Header + background), `AppSidebar`, `StatCard`, `_public.index.tsx` (hero baru), `login.tsx` & `login.$unit.tsx` (split layout).
- Komponen yang cukup retouch className: semua route page (`_app.*`, `_public.*`).
- Tambah Google Fonts via `@import url(...)` di top `src/styles.css`.

---

## Deliverable Order

1. Update `src/styles.css` (tokens + utilities + fonts + remap legacy).
2. Buat `PublicBackground` & `AppBackground` ringan (atau langsung CSS di layout).
3. Refresh `PublicHeader`, `PublicFooter`, `_public.index.tsx`, lalu sub-pages public.
4. Redesign `login.tsx` + `login.$unit.tsx`.
5. Refresh `DashboardLayout`, `AppSidebar`, `StatCard`, `PageHeader`.
6. Sweep halaman dashboard (`_app.dashboard.tsx`, laporan, USP, pengaturan, jurnal koreksi) — ganti wrapper ke `.surface-card` / `.table-modern`.
7. Verifikasi visual di mobile (390px) & desktop, cek tidak ada horizontal scroll.

Estimasi: pekerjaan UI cukup luas tapi terpusat di token CSS + ~10 komponen kunci; sisanya class sweep.
