import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Loader2, Pencil, Trash2, Power } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { invalidateFinancials } from "@/lib/query-invalidate";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/coa")({
  head: () => ({ meta: [{ title: "Bagan Akun · BUMDes" }] }),
  component: CoaPage,
});

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  normal_balance: string;
  entry_type: string;
  status: string;
};

const TYPE_COLORS: Record<string, string> = {
  ASET: "text-[var(--neon-cyan)]",
  KEWAJIBAN: "text-amber-400",
  EKUITAS: "text-fuchsia-400",
  PENDAPATAN: "text-[var(--neon-green)]",
  BEBAN: "text-rose-400",
  BEBAN_LAIN: "text-rose-300",
};

const TYPE_OPTIONS = ["ASET", "KEWAJIBAN", "EKUITAS", "PENDAPATAN", "BEBAN", "BEBAN_LAIN"];
const NORMAL_OPTIONS = ["DEBIT", "KREDIT"];
const ENTRY_OPTIONS = ["Header", "Detail"];
const STATUS_OPTIONS = ["Aktif", "Nonaktif"];

const COA_KEY = ["coa_accounts"] as const;

/**
 * Invalidate semua query yang dipengaruhi perubahan COA + bersihkan cache
 * laporan agar laporan ikut tersegarkan tanpa reload.
 */
async function invalidateCoaDependents(qc: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: COA_KEY }),
    qc.invalidateQueries({ queryKey: ["account_tree"] }),
    invalidateFinancials(qc),
  ]);
  // Hapus seluruh report_cache karena perubahan struktur akun mempengaruhi
  // semua periode/laporan. Best-effort, abaikan error jika tidak ada baris.
  try {
    await supabase.from("report_cache").delete().not("id", "is", null);
  } catch {
    // ignore
  }
}

function CoaPage() {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: COA_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coa_accounts")
        .select("*")
        .order("code", { ascending: true })
        .limit(1000);
      if (error) throw error;
      return data as Account[];
    },
  });

  // Realtime: sinkronkan UI ketika tabel coa_accounts berubah dari mana pun.
  useEffect(() => {
    const channel = supabase
      .channel("coa_accounts_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coa_accounts" },
        () => {
          qc.invalidateQueries({ queryKey: COA_KEY });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data.filter(
      (a) =>
        a.code.toLowerCase().includes(term) ||
        a.name.toLowerCase().includes(term) ||
        a.type.toLowerCase().includes(term),
    );
  }, [data, q]);

  // Toggle aktif/nonaktif dengan optimistic update.
  const toggleMutation = useMutation({
    mutationFn: async (acc: Account) => {
      const next = acc.status === "Aktif" ? "Nonaktif" : "Aktif";
      const { data, error } = await supabase
        .from("coa_accounts")
        .update({ status: next })
        .eq("id", acc.id)
        .select()
        .single();
      if (error) throw error;
      return data as Account;
    },
    onMutate: async (acc) => {
      await qc.cancelQueries({ queryKey: COA_KEY });
      const prev = qc.getQueryData<Account[]>(COA_KEY);
      const next = acc.status === "Aktif" ? "Nonaktif" : "Aktif";
      qc.setQueryData<Account[]>(COA_KEY, (old) =>
        (old ?? []).map((a) => (a.id === acc.id ? { ...a, status: next } : a)),
      );
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(COA_KEY, ctx.prev);
      toast.error(e.message);
    },
    onSuccess: () => {
      toast.success("Status diperbarui");
      void invalidateCoaDependents(qc);
    },
  });

  return (
    <>
      <PageHeader
        title="Bagan Akun (Chart of Accounts)"
        subtitle={`Kepmendesa No. 136 Tahun 2022 · ${data?.length ?? 0} akun terdaftar`}
      />

      <div className="glass-card rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 min-w-[240px] items-center gap-2 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari kode, nama akun, atau tipe..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            />
          </div>
          <button
            onClick={() =>
              setEditing({
                id: "",
                code: "",
                name: "",
                type: "ASET",
                normal_balance: "DEBIT",
                entry_type: "Detail",
                status: "Aktif",
              })
            }
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] px-4 py-2 text-sm font-medium text-[oklch(0.15_0.03_250)] glow-cyan hover:opacity-90 transition"
          >
            <Plus className="h-4 w-4" />
            Tambah Akun
          </button>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="bg-background/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground sticky top-0">
                <th className="px-4 py-3 font-medium">Kode</th>
                <th className="px-4 py-3 font-medium">Nama Akun</th>
                <th className="px-4 py-3 font-medium">Tipe</th>
                <th className="px-4 py-3 font-medium">Saldo Normal</th>
                <th className="px-4 py-3 font-medium">Jenis</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                    Memuat bagan akun...
                  </td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-destructive">
                    Gagal memuat data: {(error as Error).message}
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && !error && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Tidak ada akun yang cocok.
                  </td>
                </tr>
              )}
              {filtered.map((a) => (
                <tr
                  key={a.id}
                  className={cn(
                    "border-t border-border/60 transition hover:bg-secondary/30",
                    a.entry_type === "Header" && "bg-background/20",
                  )}
                >
                  <td className="px-4 py-2.5 font-mono text-[var(--neon-cyan)] whitespace-nowrap">
                    {a.code}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2.5",
                      a.entry_type === "Header" && "font-semibold",
                    )}
                  >
                    {a.name}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2.5 text-xs font-medium",
                      TYPE_COLORS[a.type] ?? "text-muted-foreground",
                    )}
                  >
                    {a.type}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {a.normal_balance}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {a.entry_type}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                        a.status === "Aktif"
                          ? "bg-[var(--neon-green)]/10 text-[var(--neon-green)] border border-[var(--neon-green)]/30"
                          : "bg-muted text-muted-foreground border border-border/60",
                      )}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => toggleMutation.mutate(a)}
                        disabled={toggleMutation.isPending}
                        title={a.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"}
                        className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-[var(--neon-cyan)]/50 transition disabled:opacity-60"
                      >
                        <Power className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setEditing(a)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-secondary/40 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-[var(--neon-cyan)]/50 transition"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleting(a)}
                        title="Hapus"
                        className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-xs text-muted-foreground hover:text-rose-400 hover:border-rose-400/50 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <EditAccountDialog account={editing} onClose={() => setEditing(null)} />
      <DeleteAccountDialog account={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}

function EditAccountDialog({
  account,
  onClose,
}: {
  account: Account | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Account | null>(account);
  const isCreate = account?.id === "";

  useEffect(() => {
    setForm(account);
  }, [account]);

  const mutation = useMutation({
    mutationFn: async (payload: Account) => {
      if (!payload.code.trim() || !payload.name.trim()) {
        throw new Error("Kode dan nama akun wajib diisi");
      }
      const body = {
        code: payload.code.trim(),
        name: payload.name.trim(),
        type: payload.type,
        normal_balance: payload.normal_balance,
        entry_type: payload.entry_type,
        status: payload.status,
      };
      if (isCreate) {
        const { data, error } = await supabase
          .from("coa_accounts")
          .insert(body)
          .select()
          .single();
        if (error) throw error;
        return data as Account;
      }
      const { data, error } = await supabase
        .from("coa_accounts")
        .update(body)
        .eq("id", payload.id)
        .select()
        .single();
      if (error) throw error;
      return data as Account;
    },
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: COA_KEY });
      const prev = qc.getQueryData<Account[]>(COA_KEY);
      // Optimistic: update existing row langsung di cache.
      if (!isCreate) {
        qc.setQueryData<Account[]>(COA_KEY, (old) =>
          (old ?? []).map((a) =>
            a.id === payload.id
              ? {
                  ...a,
                  ...payload,
                  code: payload.code.trim(),
                  name: payload.name.trim(),
                }
              : a,
          ),
        );
      }
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(COA_KEY, ctx.prev);
      toast.error(e.message);
    },
    onSuccess: (row) => {
      toast.success(isCreate ? "Akun ditambahkan" : "Akun diperbarui");
      // Sinkronkan dengan baris yang dikembalikan server.
      qc.setQueryData<Account[]>(COA_KEY, (old) => {
        const list = old ?? [];
        if (isCreate) return [...list, row].sort((a, b) => a.code.localeCompare(b.code));
        return list.map((a) => (a.id === row.id ? row : a));
      });
      void invalidateCoaDependents(qc);
      onClose();
    },
  });

  if (!form) return null;

  return (
    <Dialog open={!!account} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isCreate ? "Tambah Akun" : "Edit Akun"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Kode">
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="input-glass"
              placeholder="1.1.01.01"
            />
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="input-glass"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>

          <div className="col-span-2">
            <Field label="Nama Akun">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-glass"
                placeholder="Kas BUMDes"
              />
            </Field>
          </div>

          <Field label="Tipe">
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="input-glass"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Saldo Normal">
            <select
              value={form.normal_balance}
              onChange={(e) => setForm({ ...form, normal_balance: e.target.value })}
              className="input-glass"
            >
              {NORMAL_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </Field>
          <Field label="Jenis">
            <select
              value={form.entry_type}
              onChange={(e) => setForm({ ...form, entry_type: e.target.value })}
              className="input-glass"
            >
              {ENTRY_OPTIONS.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </Field>
        </div>

        <DialogFooter>
          <button
            onClick={onClose}
            disabled={mutation.isPending}
            className="rounded-lg border border-border/60 bg-secondary/40 px-4 py-2 text-sm hover:border-border transition disabled:opacity-60"
          >
            Batal
          </button>
          <button
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] px-4 py-2 text-sm font-medium text-[oklch(0.15_0.03_250)] hover:opacity-90 transition disabled:opacity-60"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Simpan
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAccountDialog({
  account,
  onClose,
}: {
  account: Account | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (acc: Account) => {
      const { error } = await supabase.from("coa_accounts").delete().eq("id", acc.id);
      if (error) throw error;
      return acc.id;
    },
    onMutate: async (acc) => {
      await qc.cancelQueries({ queryKey: COA_KEY });
      const prev = qc.getQueryData<Account[]>(COA_KEY);
      qc.setQueryData<Account[]>(COA_KEY, (old) => (old ?? []).filter((a) => a.id !== acc.id));
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(COA_KEY, ctx.prev);
      toast.error(e.message);
    },
    onSuccess: () => {
      toast.success("Akun dihapus");
      void invalidateCoaDependents(qc);
      onClose();
    },
  });

  if (!account) return null;

  return (
    <Dialog open={!!account} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Hapus akun?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Akun <span className="font-mono text-[var(--neon-cyan)]">{account.code}</span>{" "}
          <span className="text-foreground">{account.name}</span> akan dihapus permanen.
          Tindakan ini tidak dapat dibatalkan.
        </p>
        <DialogFooter>
          <button
            onClick={onClose}
            disabled={mutation.isPending}
            className="rounded-lg border border-border/60 bg-secondary/40 px-4 py-2 text-sm hover:border-border transition disabled:opacity-60"
          >
            Batal
          </button>
          <button
            onClick={() => mutation.mutate(account)}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500 transition disabled:opacity-60"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Hapus
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
