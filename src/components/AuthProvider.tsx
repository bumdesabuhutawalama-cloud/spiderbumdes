import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore, loadUserRole } from "@/hooks/use-auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setRole, setLoading, setInitialized } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    const applySession = async (user: import("@supabase/supabase-js").User | null) => {
      if (!mounted) return;
      setUser(user);
      if (user) {
        const role = await loadUserRole(user.id);
        if (!mounted) return;
        setRole(role);
      } else {
        setRole(null);
      }
      setLoading(false);
      setInitialized(true);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer Supabase calls to avoid deadlocks
      setTimeout(() => {
        void applySession(session?.user ?? null);
      }, 0);
    });

    supabase.auth.getSession().then(({ data }) => {
      void applySession(data.session?.user ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
