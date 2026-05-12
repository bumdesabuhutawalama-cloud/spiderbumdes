## Tujuan

Menambahkan layer **authentication & authorization berbasis entity (PUSAT / UNIT)** di atas arsitektur existing tanpa rewrite. Database, routing, engine jurnal, dan laporan tetap utuh — hanya menambah lapisan akses + filter data per entity.

---

## 1. Database (additive saja)

Migration baru, tidak mengubah tabel existing:

```text
profiles
  user_id (uuid, FK auth.users, unique)
  full_name (text)
  is_active (boolean, default true)

app_role (enum)        -> 'admin_pusat' | 'admin_unit'

user_roles
  user_id (uuid)
  role (app_role)
  unit_id (uuid, nullable)   -- NULL untuk admin_pusat, isi untuk admin_unit
  unique(user_id, role, unit_id)

-- Helper functions (SECURITY DEFINER, search_path=public)
has_role(_user_id, _role)         -> boolean
is_pusat(_user_id)                -> boolean
get_user_unit_id(_user_id)        -> uuid
```

Trigger `on_auth_user_created` → auto-insert ke `profiles`.

RLS: hanya `profiles` & `user_roles` yang dipasangi RLS baru. Tabel akuntansi existing TIDAK disentuh (filter dilakukan di query layer untuk menghindari risiko regresi laporan).

---

## 2. Auth Flow

- Aktifkan email/password (sudah ada Supabase Auth).
- Halaman baru: `/login` (publik) dengan email + password.
- Setelah login:
  - role `admin_pusat` → redirect `/` (Dashboard Pusat existing)
  - role `admin_unit` → redirect `/usp` (atau dashboard unit sesuai `unit_id`)
- Auto-confirm email = ON (admin pusat yang buat user, tidak perlu verifikasi email).
- Tidak pakai Google OAuth (sistem internal BUMDes).

Hook baru: `useAuth()` (Zustand) menyimpan `user`, `role`, `unitId`, `entity`.

---

## 3. Route Protection

Refactor `_app.tsx` jadi guard:
- Cek session → redirect `/login` jika tidak login.
- Load role + unit_id dari `user_roles`.
- Simpan di context router.

Guard tambahan:
- `_app.pusat.*` & route pusat (`/`, `/coa`, `/laporan/*`, `/pengaturan`, `/pusat/*`) → require `is_pusat`.
- `_app.usp.*` → require `admin_unit` dengan `unit_id` = USP, ATAU `admin_pusat` (pusat boleh lihat semua).

Implementasi via `beforeLoad` di layout route + cek di komponen.

---

## 4. Sidebar & Menu

`AppSidebar.tsx`:
- Tampilkan menu sesuai role.
- Admin unit: hanya lihat menu unit-nya, tidak lihat COA/Laporan Pusat/Pengaturan/Manajemen User.
- Admin pusat: lihat semua + menu baru "Manajemen User".

---

## 5. Manajemen User (Pusat only)

Route baru: `/pengaturan/users`
- List user (join profiles + user_roles + units).
- Create user (via server function pakai `supabaseAdmin.auth.admin.createUser` + insert role).
- Reset password (admin generate link / set password baru).
- Toggle aktif (`profiles.is_active`).
- Edit role/unit assignment.

Server functions di `src/lib/users.functions.ts` dengan middleware cek `is_pusat`.

---

## 6. Data Filtering per Entity

Strategi: **filter di layer query**, bukan RLS, untuk menjaga laporan existing.

- Hook `useEntityScope()` → return `{ entity, unitId, isPusat }`.
- Update `account-balances.ts` & laporan USP agar otomatis pakai `unitId` user jika `admin_unit`.
- Halaman USP yang sudah ada `forcedUnitId` (Neraca USP) — tinggal feed dari context.
- Pinjaman, Kegiatan USP, Transfer: filter `unit_id` saat insert/select sesuai user.

Pusat tetap bisa pilih unit manual (existing behavior).

---

## 7. Files yang Dibuat/Diubah

**Baru:**
- `supabase/migrations/<ts>_auth_entity_layer.sql`
- `src/routes/login.tsx`
- `src/routes/_app.pengaturan.users.tsx`
- `src/lib/users.functions.ts`
- `src/lib/users.server.ts`
- `src/hooks/use-auth.ts` (Zustand store)
- `src/hooks/use-entity-scope.ts`

**Diubah (minor):**
- `src/routes/_app.tsx` → tambah auth guard + load role
- `src/routes/__root.tsx` → init auth listener
- `src/routes/_app.usp.tsx` → guard entity
- `src/components/AppSidebar.tsx` → conditional menu
- `src/components/UspNav.tsx` → hide "Kembali ke Pusat" untuk admin_unit

**Tidak disentuh:**
- `account-balances.ts` (kecuali sedikit di pemanggilannya)
- semua engine jurnal
- semua laporan existing
- migration lama

---

## 8. Yang TIDAK Dilakukan

- ❌ Tidak rewrite auth.
- ❌ Tidak ubah skema tabel akuntansi.
- ❌ Tidak ubah engine jurnal/laporan.
- ❌ Tidak buat super-admin platform / multi-tenant DB.
- ❌ Tidak pasang RLS baru di tabel akuntansi (risiko regresi).

---

## 9. Pertanyaan Sebelum Eksekusi

1. **User pertama (admin pusat)**: Saya akan seed 1 akun admin pusat default (`admin@bumdes.local` / password yang user set). Setuju?
2. **Entity unit**: USP sekarang sudah ada di tabel `units` (kolom `is_pusat=false`). Saya pakai itu sebagai `unit_id`. Konfirmasi?
3. **Akses login**: Admin unit BUMDes biasanya tidak punya email pribadi — pakai username-style email (mis. `usp01@bumdes.local`)?
