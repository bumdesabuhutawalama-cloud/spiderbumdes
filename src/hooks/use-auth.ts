import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin_pusat" | "admin_unit";

export type AuthRole = {
  role: AppRole;
  unitId: string | null;
  unitName: string | null;
  unitCode: string | null;
};

type AuthState = {
  user: User | null;
  role: AuthRole | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setRole: (role: AuthRole | null) => void;
  setLoading: (v: boolean) => void;
  setInitialized: (v: boolean) => void;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  loading: true,
  initialized: false,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, role: null });
  },
}));

export async function loadUserRole(userId: string): Promise<AuthRole | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role, unit_id, units:unit_id (name, code)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const unit = data.units as { name: string; code: string | null } | null;
  return {
    role: data.role as AppRole,
    unitId: data.unit_id,
    unitName: unit?.name ?? null,
    unitCode: unit?.code ?? null,
  };
}

export function useAuth() {
  const { user, role, loading, initialized, signOut } = useAuthStore();
  const isPusat = role?.role === "admin_pusat";
  const isUnit = role?.role === "admin_unit";
  return {
    user,
    role,
    loading,
    initialized,
    isPusat,
    isUnit,
    isAuthenticated: !!user,
    signOut,
  };
}
