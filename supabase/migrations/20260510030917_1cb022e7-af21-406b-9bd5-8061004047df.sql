ALTER TABLE public.coa_accounts REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.coa_accounts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;