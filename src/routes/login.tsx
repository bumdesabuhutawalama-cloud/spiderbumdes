import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Lock, Mail, Loader2, UserPlus, ArrowLeft, ShieldCheck, Sparkles, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
  const [showPassword, setShowPassword] = useState(false);
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
      } else if (role.unitCode === "DAGANG") {
        navigate({ to: "/dagang" });
      } else {
        navigate({ to: "/usp" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen grid lg:grid-cols-2 bg-grad-soft">
      {/* LEFT — brand panel */}
      <aside
        className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between p-12 text-white"
        style={{ background: "var(--grad-navy)" }}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.18), transparent 55%), radial-gradient(circle at 80% 90%, rgba(47,111,237,0.35), transparent 55%)",
          }}
        />
        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Kembali ke beranda
          </Link>
          <div className="mt-12 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 backdrop-blur">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold">BUMDes</p>
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">Inovasi desa</p>
            </div>
          </div>

          <h1 className="mt-12 font-display text-4xl font-bold leading-tight text-white" style={{ color: "#ffffff" }}>
            Sistem keuangan modern <br />untuk desa yang transparan.
          </h1>
          <p className="mt-4 max-w-md text-white/80">
            Satu dashboard untuk direktur dan unit usaha. Pencatatan otomatis, laporan
            konsolidasi, dan transparansi publik.
          </p>
        </div>

        <ul className="relative space-y-3 text-sm">
          {[
            { icon: Sparkles, t: "Pencatatan kegiatan otomatis" },
            { icon: ShieldCheck, t: "Aman, terenkripsi, multi-role" },
          ].map((it) => (
            <li key={it.t} className="flex items-center gap-3 text-white/90">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15">
                <it.icon className="h-4 w-4" />
              </span>
              {it.t}
            </li>
          ))}
        </ul>
      </aside>

      {/* RIGHT — form */}
      <main className="flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="form-card space-y-6">
            <div className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl" style={{ background: "var(--grad-navy)", boxShadow: "var(--shadow-btn)" }}>
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <h2 className="mt-4 font-display text-xl font-bold text-brand">
                {bootstrapNeeded ? "Buat Admin Pusat" : "Selamat datang kembali"}
              </h2>
              <p className="text-sm text-brand-muted mt-1">
                {bootstrapNeeded ? "Akun pertama untuk mengelola sistem" : "Masuk ke dashboard BUMDes"}
              </p>
            </div>

            {bootstrapNeeded ? (
              <form onSubmit={handleBootstrap} className="space-y-4">
                <div
                  className="rounded-xl px-3 py-2.5 text-xs"
                  style={{ background: "var(--blue-50)", color: "var(--blue-500)", border: "1px solid rgba(47,111,237,0.18)" }}
                >
                  Belum ada Admin Pusat. Buat akun pertama untuk mengelola sistem.
                </div>
                <Field label="Nama lengkap" icon={<UserPlus className="h-4 w-4" />}>
                  <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nama Anda" className={inputCls} />
                </Field>
                <Field label="Email" icon={<Mail className="h-4 w-4" />}>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@bumdes.local" className={inputCls} />
                </Field>
                <Field label="Password (min 8 karakter)" icon={<Lock className="h-4 w-4" />}>
                  <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputCls} />
                </Field>
                <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Buat Admin Pusat
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Email" icon={<Mail className="h-4 w-4" />}>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@bumdes.local" className={inputCls} />
                </Field>
                <Field label="Password" icon={<Lock className="h-4 w-4" />}>
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputCls} />
                </Field>
                <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Masuk
                </button>
              </form>
            )}

            <p className="text-center text-[11px] text-brand-muted">
              Akun dibuat oleh Admin Pusat. Hubungi admin jika belum punya akses.
            </p>
          </div>

          <Link to="/" className="mt-4 flex items-center justify-center gap-1.5 text-xs text-brand-muted hover:text-brand lg:hidden">
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke beranda
          </Link>
        </div>
      </main>
    </div>
  );
}

const inputCls = "input-modern pl-10";

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-wide text-brand-muted">{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted">{icon}</span>
        {children}
      </div>
    </div>
  );
}
