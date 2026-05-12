import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { Building2, Lock, Mail, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CinematicBackground } from "@/components/CinematicBackground";
import { loadUserRole, useAuthStore } from "@/hooks/use-auth";

export const Route = createFileRoute("/login/$unit")({
  head: () => ({ meta: [{ title: "Login Unit · BUMDes" }] }),
  component: UnitLoginPage,
});

type UnitInfo = { id: string; name: string; code: string | null };

function UnitLoginPage() {
  const { unit: unitParam } = useParams({ from: "/login/$unit" });
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [unit, setUnit] = useState<UnitInfo | null>(null);
  const [unitLoading, setUnitLoading] = useState(true);
  const { setUser, setRole } = useAuthStore();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const code = unitParam.toUpperCase();
      const { data } = await supabase
        .from("units")
        .select("id, name, code")
        .ilike("code", code)
        .eq("is_pusat", false)
        .maybeSingle();
      if (!cancelled) {
        setUnit(data as UnitInfo | null);
        setUnitLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [unitParam]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!unit) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const user = data.user;
      if (!user) throw new Error("Login gagal");

      const role = await loadUserRole(user.id);
      if (!role) {
        await supabase.auth.signOut();
        throw new Error("Akun belum memiliki role.");
      }
      // Enforce: must match this unit
      if (role.role !== "admin_unit" || role.unitId !== unit.id) {
        await supabase.auth.signOut();
        throw new Error(`Akun ini tidak memiliki akses ke unit ${unit.name}.`);
      }
      setUser(user);
      setRole(role);
      toast.success(`Selamat datang, ${unit.name}!`);
      const target = (unit.code ?? "").toLowerCase();
      navigate({ to: `/${target || "usp"}` as never });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login gagal");
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
            </div>
            <h1 className="mt-4 text-xl font-semibold">
              Login {unit?.name ?? unitParam.toUpperCase()}
            </h1>
            <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--neon-cyan)]" />
              Akses khusus unit usaha
            </p>
          </div>

          {unitLoading ? (
            <div className="grid place-items-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !unit ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-3 text-sm text-destructive">
              Unit "{unitParam}" tidak ditemukan atau tidak aktif.
              <div className="mt-2">
                <Link to="/login" className="underline">Kembali ke login utama</Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Email" icon={<Mail className="h-4 w-4" />}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@bumdes.local"
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
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] py-2.5 text-sm font-semibold text-[oklch(0.15_0.03_250)] disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Masuk ke {unit.name}
              </button>
              <p className="text-center text-[11px] text-muted-foreground">
                <Link to="/login" className="hover:text-foreground">
                  Login admin pusat →
                </Link>
              </p>
            </form>
          )}
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
