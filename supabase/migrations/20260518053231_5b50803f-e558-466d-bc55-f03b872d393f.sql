INSERT INTO public.coa_accounts (code, name, type, normal_balance, entry_type, status)
VALUES ('1.1.03.05', 'Piutang Usaha Penjualan Kredit', 'ASET', 'DEBIT', 'Detail', 'Aktif')
ON CONFLICT DO NOTHING;