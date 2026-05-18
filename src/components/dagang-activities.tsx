import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ShoppingCart,
  PackagePlus,
  Receipt,
  HandCoins,
  Banknote,
  CreditCard,
} from "lucide-react";
import { DateField } from "@/components/DateField";
import { supabase } from "@/integrations/supabase/client";
import { invalidateFinancials } from "@/lib/query-invalidate";
import { toast } from "sonner";
import { ActivityFormShell } from "@/components/ActivityFormShell";

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  entry_type: string;
};

type Product = {
  id: string;
  code: string;
  name: string;
  uom: string;
  selling_price: number;
  avg_cost: number;
  stock_qty: number;
};

const ACC = {
  KAS_DAGANG: "1.1.01.99",
  PIUTANG: "1.1.03.01",
  PIUTANG_KREDIT: "1.1.03.05",
  PERSEDIAAN: "1.1.05.01",
  UTANG: "2.1.01.01",
  PENDAPATAN: "4.2.01.00",
  HPP: "5.1.01.00",
};

const fmtRp = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={"block " + className}>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function ActionBar({
  onClose,
  onSubmit,
  pending,
  disabled,
  accent = "from-[var(--neon-cyan)] to-[var(--neon-green)]",
}: {
  onClose: () => void;
  onSubmit: () => void;
  pending: boolean;
  disabled: boolean;
  accent?: string;
}) {
  return (
    <div className="sm:col-span-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
      <button
        onClick={onClose}
        className="rounded-lg border border-white/10 bg-secondary/40 px-4 py-2 text-sm hover:bg-secondary transition"
      >
        Batal
      </button>
      <button
        onClick={onSubmit}
        disabled={disabled || pending}
        className={`inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r ${accent} px-5 py-2 text-sm font-medium text-[oklch(0.15_0.03_250)] glow-cyan hover:opacity-90 transition disabled:opacity-50`}
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Simpan Transaksi
      </button>
    </div>
  );
}

function useAccountsByCodes(codes: string[]) {
  return useQuery({
    queryKey: ["coa_accounts_dagang", codes.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coa_accounts")
        .select("id, code, name, type, entry_type")
        .in("code", codes);
      if (error) throw error;
      const map = new Map<string, Account>();
      for (const a of data ?? []) map.set(a.code, a as Account);
      return map;
    },
  });
}

function useProducts() {
  return useQuery({
    queryKey: ["products_dagang"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, code, name, uom, selling_price, avg_cost, stock_qty")
        .eq("status", "Aktif")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });
}

async function getDagangUnitId(): Promise<string | null> {
  const { data } = await supabase.from("units").select("id").eq("code", "DAGANG").maybeSingle();
  return data?.id ?? null;
}

/* =================== Pembelian Barang Dagangan =================== */

function PembelianForm({ kredit, onClose }: { kredit: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [tanggal, setTanggal] = useState(today);
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [hargaBeli, setHargaBeli] = useState("");
  const [keterangan, setKeterangan] = useState("");

  const { data: products = [] } = useProducts();
  const { data: accs } = useAccountsByCodes([ACC.KAS_DAGANG, ACC.PERSEDIAAN, ACC.UTANG]);
  const product = products.find((p) => p.id === productId);
  const qtyN = Number(qty) || 0;
  const hargaN = Number(hargaBeli.replace(/[^\d]/g, "")) || 0;
  const total = qtyN * hargaN;

  const submit = useMutation({
    mutationFn: async () => {
      if (!product) throw new Error("Pilih produk");
      if (qtyN <= 0) throw new Error("Qty harus > 0");
      if (hargaN <= 0) throw new Error("Harga beli harus > 0");
      const persediaan = accs?.get(ACC.PERSEDIAAN);
      const lawan = kredit ? accs?.get(ACC.UTANG) : accs?.get(ACC.KAS_DAGANG);
      if (!persediaan || !lawan) throw new Error("Akun COA tidak lengkap");

      const desc =
        keterangan ||
        `Pembelian ${kredit ? "kredit" : "tunai"} ${product.name} ${qtyN} ${product.uom}`;

      const { data: je, error: jeErr } = await supabase
        .from("journal_entries")
        .insert({
          transaction_date: tanggal,
          transaction_type: kredit ? "DAGANG_PEMBELIAN_KREDIT" : "DAGANG_PEMBELIAN_TUNAI",
          description: desc,
          total_amount: total,
        })
        .select("id")
        .single();
      if (jeErr) throw jeErr;

      const { error: lErr } = await supabase.from("journal_entry_lines").insert([
        {
          journal_entry_id: je.id,
          account_id: persediaan.id,
          account_code: persediaan.code,
          account_name: persediaan.name,
          debit: total,
          credit: 0,
          line_order: 1,
        },
        {
          journal_entry_id: je.id,
          account_id: lawan.id,
          account_code: lawan.code,
          account_name: lawan.name,
          debit: 0,
          credit: total,
          line_order: 2,
        },
      ]);
      if (lErr) throw lErr;

      // Update product avg cost & stock
      const newQty = Number(product.stock_qty) + qtyN;
      const totalNilaiLama = Number(product.stock_qty) * Number(product.avg_cost);
      const newAvg = newQty > 0 ? (totalNilaiLama + total) / newQty : hargaN;
      const { error: pErr } = await supabase
        .from("products")
        .update({ stock_qty: newQty, avg_cost: newAvg })
        .eq("id", product.id);
      if (pErr) throw pErr;

      const unit_id = await getDagangUnitId();
      await supabase.from("stock_movements").insert({
        product_id: product.id,
        unit_id,
        movement_date: tanggal,
        movement_type: "IN",
        qty: qtyN,
        unit_cost: hargaN,
        total_value: total,
        reference: je.id,
        journal_entry_id: je.id,
        notes: desc,
      });
    },
    onSuccess: () => {
      toast.success("Pembelian dicatat & stok diperbarui");
      void invalidateFinancials(qc);
      void qc.invalidateQueries({ queryKey: ["products_dagang"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <ActivityFormShell
      title={`Pembelian Barang ${kredit ? "(Kredit)" : "(Tunai)"}`}
      icon={<PackagePlus className="h-4 w-4" />}
      accent="from-[var(--neon-green)] to-amber-300"
      subtitle="Persediaan bertambah otomatis. HPP rata-rata diperbarui."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <Field label="Tanggal">
          <DateField value={tanggal} onChange={setTanggal} />
        </Field>
        <Field label="Produk">
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className="input-glass">
            <option value="">Pilih produk</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name} (stok {p.stock_qty} {p.uom})
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Qty${product ? ` (${product.uom})` : ""}`}>
          <input
            type="number"
            min="0"
            step="any"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="input-glass"
            placeholder="0"
          />
        </Field>
        <Field label="Harga Beli / unit">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
            <input
              inputMode="numeric"
              value={hargaBeli ? Number(hargaBeli.replace(/[^\d]/g, "")).toLocaleString("id-ID") : ""}
              onChange={(e) => setHargaBeli(e.target.value.replace(/[^\d]/g, ""))}
              className="input-glass pl-9!"
              placeholder="0"
            />
          </div>
        </Field>
        <Field label="Keterangan" className="sm:col-span-2">
          <input
            type="text"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            className="input-glass"
            placeholder="Catatan opsional"
          />
        </Field>
        <div className="sm:col-span-2 rounded-xl border border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan)]/5 p-3 text-sm">
          <div className="text-[10px] uppercase tracking-wide text-[var(--neon-cyan)] mb-1.5">
            Pratinjau Jurnal Otomatis
          </div>
          <p>
            Dr Persediaan Barang Dagangan{" "}
            <span className="font-mono text-[var(--neon-green)]">{fmtRp(total)}</span>
          </p>
          <p>
            Cr {kredit ? "Utang Usaha" : "Kas Unit Perdagangan"}{" "}
            <span className="font-mono text-[var(--neon-green)]">{fmtRp(total)}</span>
          </p>
        </div>
        <ActionBar
          onClose={onClose}
          onSubmit={() => submit.mutate()}
          pending={submit.isPending}
          disabled={!productId || qtyN <= 0 || hargaN <= 0}
          accent="from-[var(--neon-green)] to-amber-300"
        />
      </div>
    </ActivityFormShell>
  );
}

export function PembelianTunaiForm({ onClose }: { onClose: () => void }) {
  return <PembelianForm kredit={false} onClose={onClose} />;
}
export function PembelianKreditForm({ onClose }: { onClose: () => void }) {
  return <PembelianForm kredit={true} onClose={onClose} />;
}

/* =================== Penjualan Barang Dagangan =================== */

function PenjualanForm({ kredit, onClose }: { kredit: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [tanggal, setTanggal] = useState(today);
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [hargaJual, setHargaJual] = useState("");
  const [keterangan, setKeterangan] = useState("");

  const { data: products = [] } = useProducts();
  const { data: accs } = useAccountsByCodes([
    ACC.KAS_DAGANG,
    ACC.PIUTANG,
    ACC.PIUTANG_KREDIT,
    ACC.PERSEDIAAN,
    ACC.PENDAPATAN,
    ACC.HPP,
  ]);
  const product = products.find((p) => p.id === productId);
  const qtyN = Number(qty) || 0;
  const hargaN = Number(hargaJual.replace(/[^\d]/g, "")) || 0;

  // Auto-fill harga jual dari product
  useEffect(() => {
    if (product && !hargaJual) {
      setHargaJual(String(product.selling_price || 0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const totalJual = qtyN * hargaN;
  const totalHpp = qtyN * Number(product?.avg_cost ?? 0);

  const submit = useMutation({
    mutationFn: async () => {
      if (!product) throw new Error("Pilih produk");
      if (qtyN <= 0) throw new Error("Qty harus > 0");
      if (hargaN <= 0) throw new Error("Harga jual harus > 0");
      if (Number(product.stock_qty) < qtyN)
        throw new Error(`Stok tidak cukup. Tersedia: ${product.stock_qty} ${product.uom}`);

      const kasOrPiutang = kredit ? accs?.get(ACC.PIUTANG_KREDIT) : accs?.get(ACC.KAS_DAGANG);
      const pendapatan = accs?.get(ACC.PENDAPATAN);
      const hpp = accs?.get(ACC.HPP);
      const persediaan = accs?.get(ACC.PERSEDIAAN);
      if (!kasOrPiutang || !pendapatan || !hpp || !persediaan)
        throw new Error("Akun COA tidak lengkap");

      const desc =
        keterangan ||
        `Penjualan ${kredit ? "kredit" : "tunai"} ${product.name} ${qtyN} ${product.uom}`;

      const { data: je, error: jeErr } = await supabase
        .from("journal_entries")
        .insert({
          transaction_date: tanggal,
          transaction_type: kredit ? "DAGANG_PENJUALAN_KREDIT" : "DAGANG_PENJUALAN_TUNAI",
          description: desc,
          total_amount: totalJual,
        })
        .select("id")
        .single();
      if (jeErr) throw jeErr;

      // 4 lines: Dr Kas/Piutang, Cr Pendapatan, Dr HPP, Cr Persediaan
      const lines = [
        {
          journal_entry_id: je.id,
          account_id: kasOrPiutang.id,
          account_code: kasOrPiutang.code,
          account_name: kasOrPiutang.name,
          debit: totalJual,
          credit: 0,
          line_order: 1,
        },
        {
          journal_entry_id: je.id,
          account_id: pendapatan.id,
          account_code: pendapatan.code,
          account_name: pendapatan.name,
          debit: 0,
          credit: totalJual,
          line_order: 2,
        },
      ];
      if (totalHpp > 0) {
        lines.push(
          {
            journal_entry_id: je.id,
            account_id: hpp.id,
            account_code: hpp.code,
            account_name: hpp.name,
            debit: totalHpp,
            credit: 0,
            line_order: 3,
          },
          {
            journal_entry_id: je.id,
            account_id: persediaan.id,
            account_code: persediaan.code,
            account_name: persediaan.name,
            debit: 0,
            credit: totalHpp,
            line_order: 4,
          },
        );
      }
      const { error: lErr } = await supabase.from("journal_entry_lines").insert(lines);
      if (lErr) throw lErr;

      // Update stock
      const newQty = Number(product.stock_qty) - qtyN;
      const { error: pErr } = await supabase
        .from("products")
        .update({ stock_qty: newQty })
        .eq("id", product.id);
      if (pErr) throw pErr;

      const unit_id = await getDagangUnitId();
      await supabase.from("stock_movements").insert({
        product_id: product.id,
        unit_id,
        movement_date: tanggal,
        movement_type: "OUT",
        qty: qtyN,
        unit_cost: Number(product.avg_cost),
        total_value: totalHpp,
        reference: je.id,
        journal_entry_id: je.id,
        notes: desc,
      });
    },
    onSuccess: () => {
      toast.success("Penjualan dicatat. Jurnal pendapatan & HPP otomatis.");
      void invalidateFinancials(qc);
      void qc.invalidateQueries({ queryKey: ["products_dagang"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <ActivityFormShell
      title={`Penjualan Barang ${kredit ? "(Kredit)" : "(Tunai)"}`}
      icon={<ShoppingCart className="h-4 w-4" />}
      accent="from-[var(--neon-cyan)] to-sky-400"
      subtitle="Pendapatan + HPP dijurnal otomatis. Stok berkurang."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <Field label="Tanggal">
          <DateField value={tanggal} onChange={setTanggal} />
        </Field>
        <Field label="Produk">
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className="input-glass">
            <option value="">Pilih produk</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name} (stok {p.stock_qty} {p.uom})
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Qty${product ? ` (${product.uom})` : ""}`}>
          <input
            type="number"
            min="0"
            step="any"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="input-glass"
            placeholder="0"
          />
        </Field>
        <Field label="Harga Jual / unit">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
            <input
              inputMode="numeric"
              value={hargaJual ? Number(hargaJual.replace(/[^\d]/g, "")).toLocaleString("id-ID") : ""}
              onChange={(e) => setHargaJual(e.target.value.replace(/[^\d]/g, ""))}
              className="input-glass pl-9!"
              placeholder="0"
            />
          </div>
        </Field>
        <Field label="Keterangan" className="sm:col-span-2">
          <input
            type="text"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            className="input-glass"
            placeholder="Catatan opsional"
          />
        </Field>
        <div className="sm:col-span-2 rounded-xl border border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan)]/5 p-3 text-sm space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-[var(--neon-cyan)] mb-1">
            Pratinjau Jurnal Otomatis
          </div>
          <p>
            Dr {kredit ? "Piutang Usaha Penjualan Kredit" : "Kas Unit Perdagangan"}{" "}
            <span className="font-mono text-[var(--neon-green)]">{fmtRp(totalJual)}</span>
          </p>
          <p>
            Cr Pendapatan Penjualan{" "}
            <span className="font-mono text-[var(--neon-green)]">{fmtRp(totalJual)}</span>
          </p>
          {totalHpp > 0 && (
            <>
              <p>
                Dr HPP <span className="font-mono text-[var(--neon-green)]">{fmtRp(totalHpp)}</span>
              </p>
              <p>
                Cr Persediaan{" "}
                <span className="font-mono text-[var(--neon-green)]">{fmtRp(totalHpp)}</span>
              </p>
            </>
          )}
          {product && totalHpp === 0 && qtyN > 0 && (
            <p className="text-amber-400 text-xs">
              ⚠ HPP rata-rata produk = 0 (belum ada pembelian). Jurnal HPP dilewati.
            </p>
          )}
        </div>
        <ActionBar
          onClose={onClose}
          onSubmit={() => submit.mutate()}
          pending={submit.isPending}
          disabled={!productId || qtyN <= 0 || hargaN <= 0}
          accent="from-[var(--neon-cyan)] to-sky-400"
        />
      </div>
    </ActivityFormShell>
  );
}

export function PenjualanTunaiForm({ onClose }: { onClose: () => void }) {
  return <PenjualanForm kredit={false} onClose={onClose} />;
}
export function PenjualanKreditForm({ onClose }: { onClose: () => void }) {
  return <PenjualanForm kredit={true} onClose={onClose} />;
}

/* =================== Penerimaan Piutang / Pembayaran Utang =================== */

function SimpleCashForm({
  mode,
  onClose,
}: {
  mode: "TERIMA_PIUTANG" | "BAYAR_UTANG";
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [tanggal, setTanggal] = useState(today);
  const [jumlah, setJumlah] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [piutangType, setPiutangType] = useState<"USAHA" | "KREDIT">("USAHA");

  const { data: accs } = useAccountsByCodes([
    ACC.KAS_DAGANG,
    ACC.PIUTANG,
    ACC.PIUTANG_KREDIT,
    ACC.UTANG,
  ]);
  const nominal = Number(jumlah.replace(/[^\d]/g, "")) || 0;

  const isTerima = mode === "TERIMA_PIUTANG";
  const title = isTerima ? "Penerimaan Piutang" : "Pembayaran Utang";
  const Icon = isTerima ? HandCoins : CreditCard;
  const piutangAcc = piutangType === "KREDIT" ? accs?.get(ACC.PIUTANG_KREDIT) : accs?.get(ACC.PIUTANG);
  const piutangLabel = piutangType === "KREDIT" ? "Piutang Usaha Penjualan Kredit" : "Piutang Usaha";

  const submit = useMutation({
    mutationFn: async () => {
      if (nominal <= 0) throw new Error("Jumlah harus > 0");
      const kas = accs?.get(ACC.KAS_DAGANG);
      const lawan = isTerima ? piutangAcc : accs?.get(ACC.UTANG);
      if (!kas || !lawan) throw new Error("Akun COA tidak lengkap");

      const dr = isTerima ? kas : lawan;
      const cr = isTerima ? lawan : kas;
      const desc =
        keterangan ||
        (isTerima
          ? `Penerimaan pelunasan ${piutangLabel.toLowerCase()}`
          : "Pembayaran utang ke supplier");

      const { data: je, error: jeErr } = await supabase
        .from("journal_entries")
        .insert({
          transaction_date: tanggal,
          transaction_type: `DAGANG_${mode}${isTerima ? `_${piutangType}` : ""}`,
          description: desc,
          total_amount: nominal,
        })
        .select("id")
        .single();
      if (jeErr) throw jeErr;

      const { error: lErr } = await supabase.from("journal_entry_lines").insert([
        {
          journal_entry_id: je.id,
          account_id: dr.id,
          account_code: dr.code,
          account_name: dr.name,
          debit: nominal,
          credit: 0,
          line_order: 1,
        },
        {
          journal_entry_id: je.id,
          account_id: cr.id,
          account_code: cr.code,
          account_name: cr.name,
          debit: 0,
          credit: nominal,
          line_order: 2,
        },
      ]);
      if (lErr) throw lErr;
    },
    onSuccess: () => {
      toast.success(`${title} dicatat`);
      void invalidateFinancials(qc);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <ActivityFormShell
      title={title}
      icon={<Icon className="h-4 w-4" />}
      accent={isTerima ? "from-emerald-400 to-[var(--neon-cyan)]" : "from-rose-400 to-amber-300"}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <Field label="Tanggal">
          <DateField value={tanggal} onChange={setTanggal} />
        </Field>
        <Field label="Jumlah (Rp)">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
            <input
              inputMode="numeric"
              value={jumlah ? Number(jumlah.replace(/[^\d]/g, "")).toLocaleString("id-ID") : ""}
              onChange={(e) => setJumlah(e.target.value.replace(/[^\d]/g, ""))}
              className="input-glass pl-9!"
              placeholder="0"
            />
          </div>
        </Field>
        {isTerima && (
          <Field label="Jenis Piutang" className="sm:col-span-2">
            <select
              value={piutangType}
              onChange={(e) => setPiutangType(e.target.value as "USAHA" | "KREDIT")}
              className="input-glass"
            >
              <option value="USAHA">Piutang Usaha (1.1.03.01)</option>
              <option value="KREDIT">Piutang Usaha Penjualan Kredit (1.1.03.05)</option>
            </select>
          </Field>
        )}
        <Field label="Keterangan" className="sm:col-span-2">
          <input
            type="text"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            className="input-glass"
            placeholder="Catatan opsional"
          />
        </Field>
        <div className="sm:col-span-2 rounded-xl border border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan)]/5 p-3 text-sm">
          <div className="text-[10px] uppercase tracking-wide text-[var(--neon-cyan)] mb-1.5">
            Pratinjau Jurnal Otomatis
          </div>
          {isTerima ? (
            <>
              <p>Dr Kas Unit Perdagangan <span className="font-mono text-[var(--neon-green)]">{fmtRp(nominal)}</span></p>
              <p>Cr {piutangLabel} <span className="font-mono text-[var(--neon-green)]">{fmtRp(nominal)}</span></p>
            </>
          ) : (
            <>
              <p>Dr Utang Usaha <span className="font-mono text-[var(--neon-green)]">{fmtRp(nominal)}</span></p>
              <p>Cr Kas Unit Perdagangan <span className="font-mono text-[var(--neon-green)]">{fmtRp(nominal)}</span></p>
            </>
          )}
        </div>
        <ActionBar
          onClose={onClose}
          onSubmit={() => submit.mutate()}
          pending={submit.isPending}
          disabled={nominal <= 0 || (isTerima && !piutangAcc)}
          accent={isTerima ? "from-emerald-400 to-[var(--neon-cyan)]" : "from-rose-400 to-amber-300"}
        />
      </div>
    </ActivityFormShell>
  );
}

export function PenerimaanPiutangForm({ onClose }: { onClose: () => void }) {
  return <SimpleCashForm mode="TERIMA_PIUTANG" onClose={onClose} />;
}
export function PembayaranUtangForm({ onClose }: { onClose: () => void }) {
  return <SimpleCashForm mode="BAYAR_UTANG" onClose={onClose} />;
}
