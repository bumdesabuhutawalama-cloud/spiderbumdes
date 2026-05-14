import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Lock, Mail, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CinematicBackground } from "@/components/CinematicBackground";
import { loadUserRole, useAuthStore } from "@/hooks/use-auth";
import { bootstrapAdminPusat, checkBootstrapNeeded } from "@/lib/users.functions";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login · BUMDes" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [bootstrapNeeded, setBootstrapNeeded] = useState<boolean | null>(null);
  const { setUser, setRole } = useAuthStore();
  const checkFn = useServerFn(checkBootstrapNeeded);
  const bootstrapFn = useServerFn(bootstrapAdminPusat);

  useEffect(() => {
    void checkFn().then((r) => setBootstrapNeeded(r.needed));
  }, [checkFn]);

  const handleBootstrap = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await bootstrapFn({ data: { email, password, fullName } });
      toast.success("Admin Pusat berhasil dibuat. Silakan login.");
      setBootstrapNeeded(false);
      setFullName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bootstrap gagal");
    } finally {
      setLoading(false);
    }
  };


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
        navigate({ to: "/dashboard" });
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

          {bootstrapNeeded ? (
            <form onSubmit={handleBootstrap} className="space-y-4">
              <div className="rounded-lg border border-[var(--neon-cyan)]/40 bg-[var(--neon-cyan)]/5 px-3 py-2 text-xs text-[var(--neon-cyan)]">
                Belum ada Admin Pusat. Buat akun pertama untuk mengelola sistem.
              </div>
              <Field label="Nama Lengkap" icon={<UserPlus className="h-4 w-4" />}>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nama Anda"
                  className={inputCls}
                />
              </Field>
              <Field label="Email" icon={<Mail className="h-4 w-4" />}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@bumdes.local"
                  className={inputCls}
                />
              </Field>
              <Field label="Password (min 8 karakter)" icon={<Lock className="h-4 w-4" />}>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputCls}
                />
              </Field>
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] py-2.5 text-sm font-semibold text-[oklch(0.15_0.03_250)] disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Buat Admin Pusat
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Email" icon={<Mail className="h-4 w-4" />}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@bumdes.local"
                  className={inputCls}
                />
              </Field>
              <Field label="Password" icon={<Lock className="h-4 w-4" />}>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputCls}
                />
              </Field>
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] py-2.5 text-sm font-semibold text-[oklch(0.15_0.03_250)] transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Masuk
              </button>
            </form>
          )}

          <p className="text-center text-[11px] text-muted-foreground">
            Akun dibuat oleh Admin Pusat. Hubungi admin jika belum punya akses.
          </p>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-border/60 bg-secondary/40 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[var(--neon-cyan)]/60";

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}

