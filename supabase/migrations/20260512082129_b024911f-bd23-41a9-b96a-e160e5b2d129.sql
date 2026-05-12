
-- Enum role
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin_pusat', 'admin_unit');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, unit_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_pusat(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin_pusat');
$$;

CREATE OR REPLACE FUNCTION public.get_user_unit_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT unit_id FROM public.user_roles WHERE user_id = _user_id AND role = 'admin_unit' LIMIT 1;
$$;

-- RLS profiles
DROP POLICY IF EXISTS "profiles_self_read" ON public.profiles;
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_pusat(auth.uid()));

DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_pusat(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_pusat(auth.uid()));

DROP POLICY IF EXISTS "profiles_pusat_insert" ON public.profiles;
CREATE POLICY "profiles_pusat_insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_pusat(auth.uid()) OR auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_pusat_delete" ON public.profiles;
CREATE POLICY "profiles_pusat_delete" ON public.profiles FOR DELETE TO authenticated
  USING (public.is_pusat(auth.uid()));

-- RLS user_roles
DROP POLICY IF EXISTS "user_roles_self_read" ON public.user_roles;
CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_pusat(auth.uid()));

DROP POLICY IF EXISTS "user_roles_pusat_write" ON public.user_roles;
CREATE POLICY "user_roles_pusat_write" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_pusat(auth.uid()))
  WITH CHECK (public.is_pusat(auth.uid()));

-- Trigger: auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger for profiles
DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
