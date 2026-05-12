import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  KeyRound,
  Trash2,
  Power,
  Loader2,
  Search,
  Link2,
  Pencil,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  listUsers,
  createUser,
  updateUser,
  resetUserPassword,
  setUserActive,
  deleteUser,
} from "@/lib/users.functions";

export const Route = createFileRoute("/_app/pengaturan/users")({
  head: () => ({ meta: [{ title: "Manajemen User Unit · BUMDes" }] }),
  component: UsersPage,
});

type UserRow = Awaited<ReturnType<typeof listUsers>>[number];
type UnitRow = { id: string; name: string; code: string | null; is_pusat: boolean };

const PAGE_SIZE = 10;

function UsersPage() {
  const qc = useQueryClient();
  const list = useServerFn(listUsers);
  const create = useServerFn(createUser);
  const update = useServerFn(updateUser);
  const reset = useServerFn(resetUserPassword);
  const toggle = useServerFn(setUserActive);
  const remove = useServerFn(deleteUser);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin_users"],
    queryFn: () => list(),
  });

  const { data: units } = useQuery<UnitRow[]>({
    queryKey: ["units_list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("units")
        .select("id, name, code, is_pusat")
        .order("name");
      return (data ?? []) as UnitRow[];
    },
  });

  // ===== filters =====
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin_pusat" | "admin_unit">("all");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (users ?? []).filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (unitFilter !== "all" && (u.unitId ?? "") !== unitFilter) return false;
      if (statusFilter === "active" && !u.isActive) return false;
      if (statusFilter === "inactive" && u.isActive) return false;
      if (!term) return true;
      return [u.email, u.fullName, u.username, u.jabatan, u.unitName, u.unitCode]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(term));
    });
  }, [users, q, roleFilter, unitFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ===== form state =====
  const blankForm = {
    fullName: "",
    jabatan: "",
    username: "",
    email: "",
    password: "",
    role: "admin_unit" as "admin_pusat" | "admin_unit",
    unitId: "",
  };
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);

  const openEdit = (u: UserRow) => {
    setEditing(u);
    setForm({
      fullName: u.fullName ?? "",
      jabatan: u.jabatan ?? "",
      username: u.username ?? "",
      email: u.email,
      password: "",
      role: (u.role ?? "admin_unit") as "admin_pusat" | "admin_unit",
      unitId: u.unitId ?? "",
    });
  };
  const closeEdit = () => {
    setEditing(null);
    setForm(blankForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await update({
          data: {
            userId: editing.userId,
            fullName: form.fullName,
            jabatan: form.jabatan || null,
            username: form.username || null,
            role: form.role,
            unitId: form.role === "admin_pusat" ? null : form.unitId || null,
          },
        });
        toast.success("User diperbarui.");
        closeEdit();
      } else {
        await create({
          data: {
            email: form.email,
            password: form.password,
            fullName: form.fullName,
            jabatan: form.jabatan || null,
            username: form.username || null,
            role: form.role,
            unitId: form.role === "admin_pusat" ? null : form.unitId || null,
          },
        });
        toast.success("User berhasil dibuat.");
        setForm(blankForm);
      }
      qc.invalidateQueries({ queryKey: ["admin_users"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
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

  const buildLoginLink = (unitCode: string | null) => {
    if (!unitCode) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/login/${unitCode.toLowerCase()}`;
  };

  const handleCopyLink = async (unitCode: string | null) => {
    const link = buildLoginLink(unitCode);
    if (!link) {
      toast.error("User ini tidak terhubung ke unit usaha.");
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link login unit disalin.");
    } catch {
      toast.error("Gagal menyalin link.");
    }
  };

  return (
    <>
      <PageHeader
        title="Manajemen User Unit"
        subtitle="Kelola akses login admin pusat dan admin unit usaha. Setiap unit memiliki link login khusus."
      />

      <div className="grid lg:grid-cols-[420px,1fr] gap-5">
        {/* Form create / edit */}
        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-5 space-y-3 h-fit">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              {editing ? (
                <>
                  <Pencil className="h-4 w-4 text-[var(--neon-cyan)]" /> Edit User
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 text-[var(--neon-cyan)]" /> Tambah User
                </>
              )}
            </h3>
            {editing && (
              <button
                type="button"
                onClick={closeEdit}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" /> Batal
              </button>
            )}
          </div>

          <Field label="Nama Lengkap">
            <input
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className={inputCls}
            />
          </Field>

          <Field label="Jabatan">
            <input
              value={form.jabatan}
              onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
              placeholder="cth. Kepala Unit, Bendahara"
              className={inputCls}
            />
          </Field>

          <Field label="Username (opsional)">
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="huruf, angka, . _ -"
              className={inputCls}
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              required
              disabled={!!editing}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="usp01@bumdes.local"
              className={`${inputCls} ${editing ? "opacity-60 cursor-not-allowed" : ""}`}
            />
          </Field>

          {!editing && (
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
          )}

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
            <Field label="Unit Usaha">
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
                      {u.name}
                      {u.code ? ` (${u.code})` : ""}
                    </option>
                  ))}
              </select>
            </Field>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] py-2.5 text-sm font-semibold text-[oklch(0.15_0.03_250)] disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : editing ? (
              <Pencil className="h-4 w-4" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {editing ? "Simpan Perubahan" : "Tambah User"}
          </button>
        </form>

        {/* List */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 mr-auto">
              <Users className="h-4 w-4 text-[var(--neon-cyan)]" />
              Daftar User{" "}
              <span className="text-xs text-muted-foreground">
                ({filtered.length})
              </span>
            </h3>

            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari nama, email, unit…"
                className="rounded-lg border border-border/60 bg-secondary/40 pl-7 pr-3 py-1.5 text-xs w-56 outline-none focus:border-[var(--neon-cyan)]/60"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as typeof roleFilter);
                setPage(1);
              }}
              className="rounded-lg border border-border/60 bg-secondary/40 px-2 py-1.5 text-xs"
            >
              <option value="all">Semua Role</option>
              <option value="admin_pusat">Admin Pusat</option>
              <option value="admin_unit">Admin Unit</option>
            </select>

            <select
              value={unitFilter}
              onChange={(e) => {
                setUnitFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-border/60 bg-secondary/40 px-2 py-1.5 text-xs"
            >
              <option value="all">Semua Unit</option>
              {units?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as typeof statusFilter);
                setPage(1);
              }}
              className="rounded-lg border border-border/60 bg-secondary/40 px-2 py-1.5 text-xs"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Suspend</option>
            </select>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat…</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[11px] uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left py-2">User</th>
                      <th className="text-left">Jabatan</th>
                      <th className="text-left">Role</th>
                      <th className="text-left">Unit</th>
                      <th className="text-left">Status</th>
                      <th className="text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((u) => (
                      <tr key={u.userId} className="border-t border-white/5 align-top">
                        <td className="py-2.5">
                          <div className="font-medium leading-tight">
                            {u.fullName ?? "—"}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {u.email}
                          </div>
                          {u.username && (
                            <div className="text-[11px] text-muted-foreground">
                              @{u.username}
                            </div>
                          )}
                        </td>
                        <td className="text-xs">{u.jabatan ?? "—"}</td>
                        <td>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[11px] ${
                              u.role === "admin_pusat"
                                ? "bg-[var(--neon-cyan)]/15 text-[var(--neon-cyan)]"
                                : "bg-secondary/60"
                            }`}
                          >
                            {u.role ?? "—"}
                          </span>
                        </td>
                        <td className="text-xs">
                          {u.unitName ? (
                            <>
                              {u.unitName}
                              {u.unitCode && (
                                <span className="ml-1 text-muted-foreground">
                                  ({u.unitCode})
                                </span>
                              )}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[11px] ${
                              u.isActive
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-red-500/15 text-red-300"
                            }`}
                          >
                            {u.isActive ? "Aktif" : "Suspend"}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="inline-flex gap-1 flex-wrap justify-end">
                            {u.role === "admin_unit" && u.unitCode && (
                              <IconBtn
                                title="Copy link login unit"
                                onClick={() => handleCopyLink(u.unitCode)}
                              >
                                <Link2 className="h-3.5 w-3.5" />
                              </IconBtn>
                            )}
                            <IconBtn title="Edit user" onClick={() => openEdit(u)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </IconBtn>
                            <IconBtn
                              title="Reset password"
                              onClick={() => handleReset(u.userId)}
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                            </IconBtn>
                            <IconBtn
                              title={u.isActive ? "Suspend" : "Aktifkan"}
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
                    {pageRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center text-xs text-muted-foreground"
                        >
                          Tidak ada user yang cocok dengan filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                  <span>
                    Halaman {safePage} dari {totalPages}
                  </span>
                  <div className="inline-flex gap-1">
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded border border-border/60 bg-secondary/50 px-2 py-1 disabled:opacity-40"
                    >
                      Sebelumnya
                    </button>
                    <button
                      type="button"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="rounded border border-border/60 bg-secondary/50 px-2 py-1 disabled:opacity-40"
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              )}
            </>
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
