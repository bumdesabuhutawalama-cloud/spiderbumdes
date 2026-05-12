
INSERT INTO public.coa_accounts (code, name, type, normal_balance, entry_type, status)
VALUES
  ('1.1.01.10', 'Kas Alokasi Bagi Hasil', 'ASET', 'DEBIT', 'Detail', 'Aktif'),
  ('3.3.01.06', 'Saldo Laba Dicadangkan untuk Penambahan Modal', 'EKUITAS', 'KREDIT', 'Detail', 'Aktif')
ON CONFLICT DO NOTHING;
