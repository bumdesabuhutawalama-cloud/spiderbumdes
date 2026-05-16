import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2, Loader2, Power } from "lucide-react";
import { PageHeader } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/pengaturan/bagi-hasil")({
  head: () => ({ meta: [{ title: "Master Bagi Hasil · BUMDes" }] }),
  component: MasterBagiHasilPage,
});

type CfgRow = {
  id: string;
  code: string;
  name: string;
  percentage: number;
  coa_account_code: string;
  is_active: boolean;
};

type CoaRow = { code: string; name: string; type: string; entry_type: string };

function MasterBagiHasilPage() {
  const qc = useQueryClient();

  const cfg = useQuery({
    queryKey: ["pdc-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profit_distribution_config" as never)
        .select("*")
        .order("code");
      if (error) throw error;
      return (data ?? []) as unknown as CfgRow[];
    },
  });

  const coa = useQuery({
    queryKey: ["coa-liab-equity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coa_accounts")
        .select("code, name, type, entry_type")
        .in("type", ["KEWAJIBAN", "EKUITAS"])
        .eq("status", "Aktif")
        .order("code");
      if (error) throw error;
      return (data ?? []).filter((a) => a.entry_type !== "HEADER") as CoaRow[];
    },
  });

  const [draft, setDraft] = useState<{ code: string; name: string; percentage: string; coa_account_code: string }>({
    code: "",
    name: "",
    percentage: "",
    coa_account_code: "",
  });

  const totalPct = useMemo(
    () => (cfg.data ?? []).filter((r) => r.is_active).reduce((s, r) => s + Number(r.percentage), 0),
    [cfg.data],
  );

  const create = useMutation({
    mutationFn: async () => {
      if (!draft.code.trim()) throw new Error("Kode wajib diisi.");
      if (!draft.name.trim()) throw new Error("Nama penerima wajib diisi.");
      if (!draft.coa_account_code) throw new Error("Akun COA wajib dipilih.");
      const pct = Number(draft.percentage);
      if (!(pct > 0 && pct <= 100)) throw new Error("Persentase harus 0–100.");
      const { error } = await supabase.from("profit_distribution_config" as never).insert({
        code: draft.code.trim(),
        name: draft.name.trim(),
        percentage: pct,
        coa_account_code: draft.coa_account_code,
        is_active: true,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item bagi hasil ditambahkan.");
      setDraft({ code: "", name: "", percentage: "", coa_account_code: "" });
      void qc.invalidateQueries({ queryKey: ["pdc-all"] });
      void qc.invalidateQueries({ queryKey: ["pdc"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (row: CfgRow) => {
      const { error } = await supabase
        .from("profit_distribution_config" as never)
        .update({
          code: row.code,
          name: row.name,
          percentage: Number(row.percentage),
          coa_account_code: row.coa_account_code,
          is_active: row.is_active,
        } as never)
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tersimpan.");
      void qc.invalidateQueries({ queryKey: ["pdc-all"] });
      void qc.invalidateQueries({ queryKey: ["pdc"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("profit_distribution_config" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item dihapus.");
      void qc.invalidateQueries({ queryKey: ["pdc-all"] });
      void qc.invalidateQueries({ queryKey: ["pdc"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [edits, setEdits] = useState<Record<string, Partial<CfgRow>>>({});
  const rowVal = (r: CfgRow): CfgRow => ({ ...r, ...edits[r.id] });
  const patch = (id: string, p: Partial<CfgRow>) =>
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...p } }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Bagi Hasil"
        subtitle="Tetapkan item penerima bagi hasil, persentase, dan akun COA. Item aktif akan muncul pada halaman Bagi Hasil (eksekusi)."
      />

      {/* Tambah item */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-lg font-semibold">Tambah Item</h3>
        <div className="grid gap-3 md:grid-cols-5">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Kode</label>
            <input
              value={draft.code}
              onChange={(e) => setDraft({ ...draft, code: e.target.value })}
              placeholder="BH-06"
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-muted-foreground mb-1">Nama Penerima</label>
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Misal: Dana Pendidikan"
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Akun COA</label>
            <select
              value={draft.coa_account_code}
              onChange={(e) => setDraft({ ...draft, coa_account_code: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— pilih —</option>
              {(coa.data ?? []).map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Persentase (%)</label>
            <input
              type="number"
              value={draft.percentage}
              onChange={(e) => setDraft({ ...draft, percentage: e.target.value })}
              placeholder="0"
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
        </div>
        <button
          disabled={create.isPending}
          onClick={() => create.mutate()}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
        >
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Tambah Item
        </button>
      </div>

      {/* Daftar */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Daftar Item</h3>
          <div
            className={
              "text-sm font-medium " +
              (totalPct === 100 ? "text-emerald-600" : "text-amber-600")
            }
          >
            Total aktif: {totalPct}% {totalPct === 100 ? "✓" : "(harus 100%)"}
          </div>
        </div>
        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left p-2">Kode</th>
                <th className="text-left p-2">Nama</th>
                <th className="text-left p-2">Akun COA</th>
                <th className="text-right p-2">Persentase</th>
                <th className="text-center p-2">Aktif</th>
                <th className="text-right p-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(cfg.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted-foreground">
                    Belum ada item.
                  </td>
                </tr>
              )}
              {(cfg.data ?? []).map((r0) => {
                const r = rowVal(r0);
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-2">
                      <input
                        value={r.code}
                        onChange={(e) => patch(r.id, { code: e.target.value })}
                        className="w-24 h-8 rounded-md border border-input bg-background px-2 text-sm font-mono"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        value={r.name}
                        onChange={(e) => patch(r.id, { name: e.target.value })}
                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={r.coa_account_code}
                        onChange={(e) => patch(r.id, { coa_account_code: e.target.value })}
                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        {(coa.data ?? []).map((a) => (
                          <option key={a.code} value={a.code}>
                            {a.code} — {a.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        value={r.percentage}
                        onChange={(e) => patch(r.id, { percentage: Number(e.target.value) })}
                        className="w-20 h-8 rounded-md border border-input bg-background px-2 text-sm text-right"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => update.mutate({ ...r, is_active: !r.is_active })}
                        className={
                          "inline-flex items-center gap-1 h-8 px-2 rounded-md border text-xs " +
                          (r.is_active
                            ? "border-emerald-500/40 text-emerald-700 bg-emerald-50"
                            : "border-input text-muted-foreground bg-background")
                        }
                      >
                        <Power className="h-3 w-3" />
                        {r.is_active ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td className="p-2 text-right space-x-1">
                      <button
                        disabled={update.isPending}
                        onClick={() => update.mutate(r)}
                        className="inline-flex items-center gap-1 h-8 px-2 rounded-md bg-primary text-primary-foreground text-xs hover:bg-primary/90 disabled:opacity-50"
                      >
                        <Save className="h-3 w-3" /> Simpan
                      </button>
                      <button
                        disabled={remove.isPending}
                        onClick={() => {
                          if (confirm(`Hapus item ${r.code} - ${r.name}?`)) remove.mutate(r.id);
                        }}
                        className="inline-flex items-center gap-1 h-8 px-2 rounded-md border border-destructive/40 text-destructive text-xs hover:bg-destructive/10 disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" /> Hapus
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Catatan: Item yang aktif dengan total persentase 100% akan digunakan pada halaman Bagi Hasil di Catat Kegiatan.
        </p>
      </div>
    </div>
  );
}
