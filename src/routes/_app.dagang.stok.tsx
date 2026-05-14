import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Package, Plus, X } from "lucide-react";
import { PageHeader } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatRp } from "@/lib/account-balances";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/dagang/stok")({
  head: () => ({ meta: [{ title: "Stok · BUMDes" }] }),
  component: Page,
});

type Product = {
  id: string;
  code: string;
  name: string;
  uom: string;
  selling_price: number;
  avg_cost: number;
  stock_qty: number;
  min_stock: number;
  status: string;
};

function Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products_dagang"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

  return (
    <>
      <PageHeader
        title="Manajemen Stok"
        subtitle="Daftar produk, harga jual, dan stok berjalan unit perdagangan."
        actions={
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] px-3 py-1.5 text-xs font-medium text-[oklch(0.15_0.03_250)] glow-cyan"
          >
            <Plus className="h-3.5 w-3.5" /> Produk Baru
          </button>
        }
      />

      <div className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
          <Package className="h-4 w-4 text-[var(--neon-cyan)]" /> Daftar Produk
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat…</p>
        ) : !products?.length ? (
          <p className="text-sm text-muted-foreground">Belum ada produk. Klik "Produk Baru" untuk menambah.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="text-left py-2">Kode</th>
                  <th className="text-left">Nama</th>
                  <th className="text-center">Satuan</th>
                  <th className="text-right">Harga Jual</th>
                  <th className="text-right">HPP Avg</th>
                  <th className="text-right">Stok</th>
                  <th className="text-right">Nilai Persediaan</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const low = Number(p.stock_qty) <= Number(p.min_stock || 0);
                  return (
                    <tr key={p.id} className="border-t border-white/5">
                      <td className="py-2 font-mono text-xs">{p.code}</td>
                      <td>{p.name}</td>
                      <td className="text-center text-muted-foreground">{p.uom}</td>
                      <td className="text-right font-mono">{formatRp(Number(p.selling_price))}</td>
                      <td className="text-right font-mono text-muted-foreground">{formatRp(Number(p.avg_cost))}</td>
                      <td className={`text-right font-mono ${low ? "text-amber-400" : ""}`}>{Number(p.stock_qty)}</td>
                      <td className="text-right font-mono">{formatRp(Number(p.stock_qty) * Number(p.avg_cost))}</td>
                      <td className="text-center">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] uppercase ${p.status === "Aktif" ? "bg-[var(--neon-cyan)]/15 text-[var(--neon-cyan)]" : "bg-secondary/60 text-muted-foreground"}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && <NewProductDialog onClose={() => setOpen(false)} onSaved={() => { void qc.invalidateQueries({ queryKey: ["products_dagang"] }); }} />}
    </>
  );
}

function NewProductDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [uom, setUom] = useState("PCS");
  const [price, setPrice] = useState("");
  const [minStock, setMinStock] = useState("0");

  const save = useMutation({
    mutationFn: async () => {
      if (!code.trim() || !name.trim()) throw new Error("Kode & nama wajib diisi");
      const { data: unit } = await supabase.from("units").select("id").eq("code", "DAGANG").maybeSingle();
      const { error } = await supabase.from("products").insert({
        code: code.trim(),
        name: name.trim(),
        uom: uom.trim() || "PCS",
        selling_price: Number(price.replace(/[^\d]/g, "")) || 0,
        min_stock: Number(minStock) || 0,
        unit_id: unit?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produk ditambahkan");
      onSaved();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="glass-card relative w-full max-w-md rounded-2xl border border-white/10 p-5" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg bg-secondary/60 hover:bg-secondary"><X className="h-4 w-4" /></button>
        <h3 className="text-base font-semibold mb-3">Produk Baru</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-muted-foreground">Kode</span>
            <input value={code} onChange={(e) => setCode(e.target.value)} className="input-glass mt-1" placeholder="P001" />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Satuan</span>
            <input value={uom} onChange={(e) => setUom(e.target.value)} className="input-glass mt-1" placeholder="PCS" />
          </label>
          <label className="block col-span-2">
            <span className="text-xs text-muted-foreground">Nama Produk</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input-glass mt-1" />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Harga Jual</span>
            <input
              inputMode="numeric"
              value={price ? Number(price.replace(/[^\d]/g, "")).toLocaleString("id-ID") : ""}
              onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
              className="input-glass mt-1"
              placeholder="0"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Min. Stok</span>
            <input type="number" value={minStock} onChange={(e) => setMinStock(e.target.value)} className="input-glass mt-1" />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-white/10 bg-secondary/40 px-4 py-2 text-sm">Batal</button>
          <button
            disabled={save.isPending}
            onClick={() => save.mutate()}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] px-4 py-2 text-sm font-medium text-[oklch(0.15_0.03_250)]"
          >
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Simpan
          </button>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Stok awal akan terisi otomatis saat Anda mencatat Pembelian. HPP rata-rata dihitung otomatis.
        </p>
      </div>
    </div>
  );
}
