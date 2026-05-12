import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, Lock, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CinematicBackground } from "@/components/CinematicBackground";
import { loadUserRole, useAuthStore } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login · BUMDes" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser, setRole } = useAuthStore();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const user = data.user;
      if (!user) throw new Error("Login gagal");

      const role = await loadUserRole(user.id);
      setUser(user);
      setRole(role);

      if (!role) {
        toast.error("Akun belum memiliki role. Hubungi admin pusat.");
        await supabase.auth.signOut();
        return;
      }

      toast.success(`Selamat datang${role.unitName ? `, ${role.unitName}` : ""}!`);
      if (role.role === "admin_pusat") {
        navigate({ to: "/" });
      } else {
        navigate({ to: "/usp" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login gagal";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 text-foreground">
      <CinematicBackground />
      <div className="relative w-full max-w-md">
        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-green)]">
              <Building2 className="h-7 w-7 text-[oklch(0.15_0.03_250)]" />
              <div className="absolute inset-0 rounded-2xl glow-cyan" />
            </div>
            <h1 className="mt-4 text-xl font-semibold">BUMDes</h1>
            <p className="text-sm text-muted-foreground">
              Sistem Konsolidasi Keuangan Multi-Unit
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@bumdes.local"
                  className="w-full rounded-lg border border-border/60 bg-secondary/40 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[var(--neon-cyan)]/60"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border/60 bg-secondary/40 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[var(--neon-cyan)]/60"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] py-2.5 text-sm font-semibold text-[oklch(0.15_0.03_250)] transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Masuk
            </button>
          </form>

          <p className="text-center text-[11px] text-muted-foreground">
            Akun dibuat oleh Admin Pusat. Hubungi admin jika belum punya akses.
          </p>
        </div>
      </div>
    </div>
  );
}
