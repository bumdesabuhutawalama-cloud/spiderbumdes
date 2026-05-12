GRANT EXECUTE ON FUNCTION public.is_pusat(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_unit_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;