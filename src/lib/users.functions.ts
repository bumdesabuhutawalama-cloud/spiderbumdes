import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertPusat(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin_pusat")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Hanya admin pusat yang dapat melakukan aksi ini.");
}

// ============ Bootstrap: seed first admin pusat (only if none exists) ============
export const bootstrapAdminPusat = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(8).max(72),
        fullName: z.string().min(1).max(100),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { count, error: countErr } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin_pusat");
    if (countErr) throw new Error(countErr.message);
    if ((count ?? 0) > 0) {
      throw new Error("Admin Pusat sudah ada. Bootstrap dinonaktifkan.");
    }

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (createErr) throw new Error(createErr.message);
    const uid = created.user?.id;
    if (!uid) throw new Error("Gagal membuat user.");

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: uid, role: "admin_pusat", unit_id: null });
    if (roleErr) throw new Error(roleErr.message);
    return { ok: true };
  });

export const checkBootstrapNeeded = createServerFn({ method: "GET" }).handler(async () => {
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin_pusat");
  return { needed: (count ?? 0) === 0 };
});

// ============ List users (admin pusat only) ============
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPusat(context.userId);

    const [{ data: profiles }, { data: roles }, { data: units }, authList] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("user_id, full_name, is_active, created_at, jabatan, username"),
      supabaseAdmin.from("user_roles").select("user_id, role, unit_id"),
      supabaseAdmin.from("units").select("id, name, code"),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
    ]);

    const unitMap = new Map((units ?? []).map((u) => [u.id, u]));
    const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r]));
    const profMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

    return (authList.data?.users ?? []).map((u) => {
      const r = roleMap.get(u.id);
      const unit = r?.unit_id ? unitMap.get(r.unit_id) : null;
      const p = profMap.get(u.id) as
        | { full_name: string | null; is_active: boolean; jabatan: string | null; username: string | null }
        | undefined;
      return {
        userId: u.id,
        email: u.email ?? "",
        fullName: p?.full_name ?? null,
        jabatan: p?.jabatan ?? null,
        username: p?.username ?? null,
        isActive: p?.is_active ?? true,
        role: r?.role ?? null,
        unitId: r?.unit_id ?? null,
        unitName: unit?.name ?? null,
        unitCode: unit?.code ?? null,
        createdAt: u.created_at,
      };
    });
  });

// ============ Create user ============
export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(8).max(72),
        fullName: z.string().min(1).max(100),
        jabatan: z.string().max(100).nullable().optional(),
        username: z.preprocess((v) => (v === "" || v == null ? null : v), z.string().min(3).max(50).regex(/^[a-zA-Z0-9_.-]+$/).nullable().optional()),
        role: z.enum(["admin_pusat", "admin_unit"]),
        unitId: z.string().uuid().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertPusat(context.userId);
    if (data.role === "admin_unit" && !data.unitId) {
      throw new Error("Unit wajib dipilih untuk role admin_unit.");
    }

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error) throw new Error(error.message);
    const uid = created.user?.id;
    if (!uid) throw new Error("Gagal membuat user.");

    // Update profile with extra fields (profile auto-created by trigger)
    await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.fullName,
        jabatan: data.jabatan ?? null,
        username: data.username ?? null,
      })
      .eq("user_id", uid);

    const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({
      user_id: uid,
      role: data.role,
      unit_id: data.role === "admin_pusat" ? null : data.unitId,
    });
    if (roleErr) throw new Error(roleErr.message);
    return { ok: true, userId: uid };
  });

// ============ Update user (profile + role/unit) ============
export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        fullName: z.string().min(1).max(100),
        jabatan: z.string().max(100).nullable().optional(),
        username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_.-]+$/).nullable().optional(),
        role: z.enum(["admin_pusat", "admin_unit"]),
        unitId: z.string().uuid().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertPusat(context.userId);
    if (data.role === "admin_unit" && !data.unitId) {
      throw new Error("Unit wajib dipilih untuk role admin_unit.");
    }

    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.fullName,
        jabatan: data.jabatan ?? null,
        username: data.username ?? null,
      })
      .eq("user_id", data.userId);
    if (pErr) throw new Error(pErr.message);

    // upsert role
    const { data: existing } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", data.userId)
      .maybeSingle();

    const newRole = {
      user_id: data.userId,
      role: data.role,
      unit_id: data.role === "admin_pusat" ? null : data.unitId,
    };
    if (existing) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .update(newRole)
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("user_roles").insert(newRole);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ============ Reset password ============
export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ userId: z.string().uuid(), newPassword: z.string().min(8).max(72) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertPusat(context.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.newPassword,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Toggle active ============
export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ userId: z.string().uuid(), isActive: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertPusat(context.userId);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ is_active: data.isActive })
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.isActive ? "none" : "876000h",
    });
    return { ok: true };
  });

// ============ Delete user ============
export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertPusat(context.userId);
    if (data.userId === context.userId) throw new Error("Tidak dapat menghapus diri sendiri.");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
