import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
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

function CoaPage() {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Account | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["coa_accounts"],
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
                    <button
                      onClick={() => setEditing(a)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-secondary/40 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-[var(--neon-cyan)]/50 transition"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <EditAccountDialog account={editing} onClose={() => setEditing(null)} />
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
      if (isCreate) {
        const { error } = await supabase.from("coa_accounts").insert({
          code: payload.code.trim(),
          name: payload.name.trim(),
          type: payload.type,
          normal_balance: payload.normal_balance,
          entry_type: payload.entry_type,
          status: payload.status,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("coa_accounts")
          .update({
            code: payload.code.trim(),
            name: payload.name.trim(),
            type: payload.type,
            normal_balance: payload.normal_balance,
            entry_type: payload.entry_type,
            status: payload.status,
          })
          .eq("id", payload.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isCreate ? "Akun ditambahkan" : "Akun diperbarui");
      qc.invalidateQueries({ queryKey: ["coa_accounts"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
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
            className="rounded-lg border border-border/60 bg-secondary/40 px-4 py-2 text-sm hover:border-border transition"
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
