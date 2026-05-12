-- Tighten loans RLS to scope per unit
DROP POLICY IF EXISTS loans_auth_read ON public.loans;
DROP POLICY IF EXISTS loans_auth_insert ON public.loans;
DROP POLICY IF EXISTS loans_auth_update ON public.loans;
DROP POLICY IF EXISTS loans_auth_delete ON public.loans;

CREATE POLICY loans_scoped_read ON public.loans
  FOR SELECT TO authenticated
  USING (public.is_pusat(auth.uid()) OR unit_id = public.get_user_unit_id(auth.uid()));

CREATE POLICY loans_scoped_insert ON public.loans
  FOR INSERT TO authenticated
  WITH CHECK (public.is_pusat(auth.uid()) OR unit_id = public.get_user_unit_id(auth.uid()));

CREATE POLICY loans_scoped_update ON public.loans
  FOR UPDATE TO authenticated
  USING (public.is_pusat(auth.uid()) OR unit_id = public.get_user_unit_id(auth.uid()))
  WITH CHECK (public.is_pusat(auth.uid()) OR unit_id = public.get_user_unit_id(auth.uid()));

CREATE POLICY loans_scoped_delete ON public.loans
  FOR DELETE TO authenticated
  USING (public.is_pusat(auth.uid()) OR unit_id = public.get_user_unit_id(auth.uid()));

-- Tighten loan_installments via JOIN to loans
DROP POLICY IF EXISTS li_auth_read ON public.loan_installments;
DROP POLICY IF EXISTS li_auth_insert ON public.loan_installments;
DROP POLICY IF EXISTS li_auth_update ON public.loan_installments;
DROP POLICY IF EXISTS li_auth_delete ON public.loan_installments;

CREATE POLICY li_scoped_read ON public.loan_installments
  FOR SELECT TO authenticated
  USING (
    public.is_pusat(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.loans l
      WHERE l.id = loan_installments.loan_id
        AND l.unit_id = public.get_user_unit_id(auth.uid())
    )
  );

CREATE POLICY li_scoped_insert ON public.loan_installments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_pusat(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.loans l
      WHERE l.id = loan_installments.loan_id
        AND l.unit_id = public.get_user_unit_id(auth.uid())
    )
  );

CREATE POLICY li_scoped_update ON public.loan_installments
  FOR UPDATE TO authenticated
  USING (
    public.is_pusat(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.loans l
      WHERE l.id = loan_installments.loan_id
        AND l.unit_id = public.get_user_unit_id(auth.uid())
    )
  )
  WITH CHECK (
    public.is_pusat(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.loans l
      WHERE l.id = loan_installments.loan_id
        AND l.unit_id = public.get_user_unit_id(auth.uid())
    )
  );

CREATE POLICY li_scoped_delete ON public.loan_installments
  FOR DELETE TO authenticated
  USING (
    public.is_pusat(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.loans l
      WHERE l.id = loan_installments.loan_id
        AND l.unit_id = public.get_user_unit_id(auth.uid())
    )
  );