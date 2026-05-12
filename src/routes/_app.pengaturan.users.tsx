import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, UserPlus, KeyRound, Trash2, Power, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  listUsers,
  createUser,
  resetUserPassword,
  setUserActive,
  deleteUser,
} from "@/lib/users.functions";

export const Route = createFileRoute("/_app/pengaturan/users")({
  head: () => ({ meta: [{ title: "Manajemen User · BUMDes" }] }),
  component: UsersPage,
});

function UsersPage() {
  const qc = useQueryClient();
  const list = useServerFn(listUsers);
  const create = useServerFn(createUser);
  const reset = useServerFn(resetUserPassword);
  const toggle = useServerFn(setUserActive);
  const remove = useServerFn(deleteUser);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin_users"],
    queryFn: () => list(),
  });

  const { data: units } = useQuery({
    queryKey: ["units_list"],
    queryFn: async () => {
      const { data } = await supabase.from("units").select("id, name, code, is_pusat").order("name");
      return data ?? [];
    },
  });

  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "admin_unit" as "admin_pusat" | "admin_unit",
    unitId: "",
  });
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await create({
        data: {
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          role: form.role,
          unitId: form.role === "admin_pusat" ? null : form.unitId || null,
        },
      });
      toast.success("User berhasil dibuat.");
      setForm({ email: "", password: "", fullName: "", role: "admin_unit", unitId: "" });
      qc.invalidateQueries({ queryKey: ["admin_users"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat user");
    } finally {
      setCreating(false);
    }
  };

  const handleReset = async (userId: string) => {
    const pw = window.prompt("Password baru (min 8 karakter):");
    if (!pw || pw.length < 8) return;
    try {
      await reset({ data: { userId, newPassword: pw } });
      toast.success("Password berhasil di-reset.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal reset password");
    }
  };

  const handleToggle = async (userId: string, isActive: boolean) => {
    try {
      await toggle({ data: { userId, isActive: !isActive } });
      toast.success(isActive ? "User dinonaktifkan." : "User diaktifkan.");
      qc.invalidateQueries({ queryKey: ["admin_users"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status");
    }
  };

  const handleDelete = async (userId: string, email: string) => {
    if (!window.confirm(`Hapus user ${email}? Aksi ini permanen.`)) return;
    try {
      await remove({ data: { userId } });
      toast.success("User dihapus.");
      qc.invalidateQueries({ queryKey: ["admin_users"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus user");
    }
  };

  return (
    <>
      <PageHeader
        title="Manajemen User"
        subtitle="Buat dan kelola akses user untuk Unit Pusat dan Unit Usaha."
      />

      <div className="grid lg:grid-cols-[420px,1fr] gap-5">
        {/* Form create */}
        <form onSubmit={handleCreate} className="glass-card rounded-2xl p-5 space-y-3 h-fit">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-[var(--neon-cyan)]" /> Buat User Baru
          </h3>

          <Field label="Nama Lengkap">
            <input
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className={inputCls}
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="usp01@bumdes.local"
              className={inputCls}
            />
          </Field>

          <Field label="Password (min 8 karakter)">
            <input
              type="text"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={inputCls}
            />
          </Field>

          <Field label="Role">
            <select
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value as "admin_pusat" | "admin_unit" })
              }
              className={inputCls}
            >
              <option value="admin_unit">Admin Unit</option>
              <option value="admin_pusat">Admin Pusat</option>
            </select>
          </Field>

          {form.role === "admin_unit" && (
            <Field label="Unit">
              <select
                required
                value={form.unitId}
                onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                className={inputCls}
              >
                <option value="">— pilih unit —</option>
                {units
                  ?.filter((u) => !u.is_pusat)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.code})
                    </option>
                  ))}
              </select>
            </Field>
          )}

          <button
            type="submit"
            disabled={creating}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] py-2.5 text-sm font-semibold text-[oklch(0.15_0.03_250)] disabled:opacity-60"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Buat User
          </button>
        </form>

        {/* List */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-[var(--neon-cyan)]" /> Daftar User
          </h3>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left py-2">Email</th>
                    <th className="text-left">Nama</th>
                    <th className="text-left">Role</th>
                    <th className="text-left">Unit</th>
                    <th className="text-left">Status</th>
                    <th className="text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {(users ?? []).map((u) => (
                    <tr key={u.userId} className="border-t border-white/5">
                      <td className="py-2">{u.email}</td>
                      <td>{u.fullName ?? "—"}</td>
                      <td>
                        <span className="rounded px-1.5 py-0.5 text-[11px] bg-secondary/60">
                          {u.role ?? "—"}
                        </span>
                      </td>
                      <td>{u.unitName ?? "—"}</td>
                      <td>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[11px] ${
                            u.isActive
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-red-500/15 text-red-300"
                          }`}
                        >
                          {u.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="inline-flex gap-1">
                          <IconBtn
                            title="Reset password"
                            onClick={() => handleReset(u.userId)}
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </IconBtn>
                          <IconBtn
                            title={u.isActive ? "Nonaktifkan" : "Aktifkan"}
                            onClick={() => handleToggle(u.userId, u.isActive)}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </IconBtn>
                          <IconBtn
                            title="Hapus"
                            onClick={() => handleDelete(u.userId, u.email)}
                            danger
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const inputCls =
  "w-full rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-sm outline-none focus:border-[var(--neon-cyan)]/60";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`grid h-7 w-7 place-items-center rounded border border-border/60 bg-secondary/50 hover:bg-secondary ${
        danger ? "hover:text-destructive hover:border-destructive/60" : ""
      }`}
    >
      {children}
    </button>
  );
}
