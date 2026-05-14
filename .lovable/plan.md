## Fitur: Auto Journal Correction Wizard

Tujuan: tambah menu "Jurnal Koreksi" yang membuat jurnal baru terhubung ke jurnal asli, tanpa mengedit jurnal lama dan tanpa user menyentuh debit/kredit (kecuali mode gabungan).

### 1. Database (migration)

Tambah kolom pada `journal_entries`:
- `original_journal_id uuid NULL` — referensi ke jurnal yang dikoreksi
- `correction_type text NULL` — `reversal` | `adjust_amount` | `reclass` | `full_adjustment`
- `correction_reason text NULL`
- `status text NOT NULL DEFAULT 'Posted'` — nilai: `Posted` | `Corrected`

Index: `idx_journal_entries_original` pada `original_journal_id`.

Tidak mengubah kolom/logic existing. Trigger balance & cache tetap berjalan otomatis untuk jurnal koreksi karena memakai `journal_entries` + `journal_entry_lines` yang sudah ada.

### 2. Service layer (`src/lib/journal-correction.ts`)

Fungsi-fungsi:
- `fetchJournal(id)` → ambil jurnal + lines + (jika ada) link koreksi
- `createReversal(journalId, reason, date)` → swap debit/credit semua line, set metadata, mark original = Corrected
- `createAmountAdjustment(journalId, newAmount, reason, date)` → hitung selisih, scale tiap line proporsional terhadap `total_amount` lama, akun tetap sama, debit/credit sama (jika selisih negatif → swap)
- `createReclass({ journalId, lineId, newAccountId, reason, date })` → 1 jurnal: debit akun baru + kredit akun lama (atau swap jika baris asli adalah credit) sebesar nominal baris terpilih
- `createFullAdjustment({ journalId, lines, reason, date })` → terima lines lengkap dari user (validasi balanced)

Semua fungsi:
1. Insert `journal_entries` baru dengan `original_journal_id`, `correction_type`, `correction_reason`, `status='Posted'`, `transaction_type='KOREKSI'`.
2. Insert `journal_entry_lines` (trigger akan re-balance otomatis).
3. UPDATE jurnal lama set `status='Corrected'`.

### 3. UI

**Route baru:** `src/routes/_app.jurnal-koreksi.tsx`
- Tabel jurnal: tanggal, deskripsi, total, status (badge `Posted`/`Corrected`), tombol "Koreksi" (disabled jika sudah Corrected), kolom "Koreksi oleh" link ke jurnal koreksi.
- Filter periode + search.
- Tombol "Koreksi" → buka wizard.

**Komponen:** `src/components/JournalCorrectionWizard.tsx` (Dialog multi-step)
- Step 1: pilih tipe koreksi (4 kartu).
- Step 2: form sesuai tipe:
  - Reversal: konfirmasi + textarea alasan + tanggal.
  - Adjust Amount: tampil nominal lama (readonly), input nominal seharusnya, alasan, tanggal.
  - Reclass: pilih baris (radio list akun + nominal lama readonly), dropdown akun tujuan (dari `coa_accounts` non-Header), alasan, tanggal.
  - Full Adjustment: prefill lines dari jurnal asli, editable account+debit+credit, validasi balanced, alasan, tanggal.
- Submit → panggil service → toast → invalidate query.

**Sidebar (`src/components/AppSidebar.tsx`):** tambah item "Jurnal Koreksi" dengan icon `FileEdit`, link `/jurnal-koreksi`.

### 4. Tampilan link asli ↔ koreksi
Pada baris jurnal asli yang `Corrected`: tampilkan badge + tombol "Lihat jurnal koreksi" yang menggulir ke baris koreksi (atau highlight baris dengan id tersebut).
Pada baris jurnal koreksi: tampilkan badge tipe + chip "Mengoreksi: <ref>".

### Catatan teknis
- Tidak menyentuh `usp-dialogs.tsx`, `general-activities.tsx`, atau modul jurnal otomatis existing.
- Tidak ubah trigger / RLS existing — RLS `je_auth_*` & `jel_auth_*` sudah `true` untuk authenticated, jadi insert/update jalan.
- Kolom `transaction_type` diisi `KOREKSI` agar mudah dibedakan di laporan.
- Validasi: tidak boleh mengoreksi jurnal yang sudah `Corrected`.
