import { useMemo, useRef, useState } from "react";
import { Calendar, Download, FileSpreadsheet, Loader2, Printer, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { buildReportFilename, exportElementToPdf } from "@/lib/pdf-export";
import { formatRp } from "@/lib/account-balances";
import {
  useCoaForLedger,
  useEntityList,
  useLedger,
  type EntityScope,
} from "@/lib/ledger";

const todayISO = () => new Date().toISOString().slice(0, 10);
const yearStart = () => `${new Date().getFullYear()}-01-01`;

type Mode = "pusat" | "konsolidasi" | { unitId: string; unitName: string };

export function BukuBesarSheet({
  title,
  subtitle,
  mode,
}: {
  title: string;
  subtitle: string;
  mode: Mode;
}) {
  const [start, setStart] = useState(yearStart());
  const [end, setEnd] = useState(todayISO());
  const [accountId, setAccountId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>(""); // konsolidasi only
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 50;

  const { data: coa } = useCoaForLedger();
  const { data: entities } = useEntityList();

  const scope: EntityScope = useMemo(() => {
    if (mode === "pusat") return { kind: "pusat" };
    if (mode === "konsolidasi") return { kind: "konsolidasi", entityFilter: entityFilter || null };
    return { kind: "unit", unitId: mode.unitId };
  }, [mode, entityFilter]);

  const { data, isLoading, error } = useLedger(accountId, start, end, scope);

  const filteredCoa = useMemo(() => {
    if (!coa) return [];
    const q = search.trim().toLowerCase();
    if (!q) return coa;
    return coa.filter(
      (a) => a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q),
    );
  }, [coa, search]);

  const lines = data?.lines ?? [];
  const pageCount = Math.max(1, Math.ceil(lines.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageLines = lines.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleExportPdf = async () => {
    if (!reportRef.current) return;
    try {
      setExporting(true);
      await exportElementToPdf(reportRef.current, buildReportFilename(title, end));
      toast.success("PDF berhasil diunduh");
    } catch (e) {
      toast.error("Gagal export PDF: " + (e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = () => {
    if (!data || !data.account) {
      toast.error("Pilih akun terlebih dahulu");
      return;
    }
    const rows = [
      ["Tanggal", "Entity", "Uraian", "Bukti", "Ref", "Debit", "Kredit", "Saldo Berjalan"],
      ["", "", `Saldo Awal per ${start}`, "", "", "", "", String(data.opening)],
      ...lines.map((l) => [
        l.date,
        l.entity.code,
        l.description ?? "",
        l.bukti,
        l.ref,
        String(l.debit),
        String(l.credit),
        String(l.running),
      ]),
      ["", "", "TOTAL", "", "", String(data.totalDebit), String(data.totalCredit), String(data.ending)],
    ];
    const csv = rows
      .map((r) =>
        r
          .map((c) => {
            const s = String(c).replace(/"/g, '""');
            return /[",;\n]/.test(s) ? `"${s}"` : s;
          })
          .join(";"),
      )
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildReportFilename(title, end).replace(/\.pdf$/, ".csv");
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Excel/CSV berhasil diunduh");
  };

  const handlePrint = () => window.print();

  const showEntityCol = mode !== "pusat" && (mode === "konsolidasi" || false);

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/60 px-3 py-2 text-sm hover:bg-secondary"
            >
              <Printer className="h-4 w-4" /> Print
            </button>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/60 px-3 py-2 text-sm hover:bg-secondary"
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </button>
            <button
              onClick={handleExportPdf}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] px-4 py-2 text-sm font-medium text-[oklch(0.15_0.03_250)] glow-cyan hover:opacity-90 transition disabled:opacity-50"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exporting ? "Mengekspor..." : "PDF"}
            </button>
          </>
        }
      />

      {/* Filter bar */}
      <div className="glass-card mb-4 rounded-2xl p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-5">
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">Akun</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kode atau nama akun..."
                className="mb-2 w-full rounded-lg border border-border/60 bg-secondary/60 pl-9 pr-3 py-2 text-sm outline-none"
              />
            </div>
            <select
              value={accountId ?? ""}
              onChange={(e) => {
                setAccountId(e.target.value || null);
                setPage(1);
              }}
              className="w-full rounded-lg border border-border/60 bg-secondary/60 px-3 py-2 text-sm outline-none"
            >
              <option value="">— Pilih akun —</option>
              {filteredCoa.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">Periode</label>
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/60 px-3 py-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="bg-transparent outline-none [color-scheme:dark]"
              />
              <span className="text-muted-foreground">—</span>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="bg-transparent outline-none [color-scheme:dark]"
              />
            </div>
          </div>

          {mode === "konsolidasi" && (
            <div className="md:col-span-4">
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">Entity</label>
              <select
                value={entityFilter}
                onChange={(e) => {
                  setEntityFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-border/60 bg-secondary/60 px-3 py-2 text-sm outline-none"
              >
                <option value="">Semua Entity</option>
                {(entities ?? []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-3 sm:p-5">
        <div ref={reportRef} className="overflow-x-auto rounded-xl border border-border/60 bg-card/60 p-4">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3 border-b border-border/60 pb-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Buku Besar</p>
              <h2 className="text-lg font-semibold">
                {data?.account ? `${data.account.code} — ${data.account.name}` : "Pilih akun untuk menampilkan buku besar"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Periode {start} s.d. {end}
                {mode === "konsolidasi" && entityFilter && entities && (
                  <> · Entity: {entities.find((x) => x.id === entityFilter)?.name}</>
                )}
                {typeof mode === "object" && <> · Entity: {mode.unitName}</>}
                {mode === "pusat" && <> · Entity: Pusat</>}
              </p>
            </div>
            {data?.account && (
              <div className="text-right text-xs text-muted-foreground">
                <div>Saldo Awal: <span className="font-mono text-foreground">{formatRp(data.opening)}</span></div>
                <div>Saldo Akhir: <span className="font-mono text-[var(--neon-cyan)]">{formatRp(data.ending)}</span></div>
              </div>
            )}
          </div>

          {isLoading && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Memuat buku besar...
            </div>
          )}
          {error && (
            <div className="py-8 text-center text-sm text-rose-400">
              Gagal memuat: {(error as Error).message}
            </div>
          )}

          {!isLoading && !error && data?.account && (
            <>
              <table className="w-full min-w-[860px] text-[13px]">
                <thead>
                  <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-2 py-2">Tanggal</th>
                    {(mode === "konsolidasi" || showEntityCol) && <th className="px-2 py-2">Entity</th>}
                    <th className="px-2 py-2">Uraian</th>
                    <th className="px-2 py-2">Bukti</th>
                    <th className="px-2 py-2">Ref</th>
                    <th className="px-2 py-2 text-right">Debit</th>
                    <th className="px-2 py-2 text-right">Kredit</th>
                    <th className="px-2 py-2 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/40 bg-secondary/30 italic text-muted-foreground">
                    <td className="px-2 py-1.5" colSpan={mode === "konsolidasi" ? 5 : 4}>Saldo Awal per {start}</td>
                    <td className="px-2 py-1.5" />
                    <td className="px-2 py-1.5" />
                    <td className="px-2 py-1.5 text-right font-mono">{formatRp(data.opening)}</td>
                  </tr>
                  {pageLines.length === 0 && (
                    <tr>
                      <td colSpan={mode === "konsolidasi" ? 8 : 7} className="px-2 py-8 text-center text-muted-foreground">
                        Tidak ada transaksi pada periode ini.
                      </td>
                    </tr>
                  )}
                  {pageLines.map((l) => (
                    <tr key={l.id} className="border-b border-border/40 hover:bg-secondary/40">
                      <td className="px-2 py-1.5 font-mono text-xs">{l.date}</td>
                      {(mode === "konsolidasi" || showEntityCol) && (
                        <td className="px-2 py-1.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "border-border/60 text-[10px]",
                              l.entity.id === "PUSAT"
                                ? "border-[var(--neon-cyan)]/40 text-[var(--neon-cyan)]"
                                : "border-emerald-500/40 text-emerald-400",
                            )}
                          >
                            {l.entity.code}
                          </Badge>
                        </td>
                      )}
                      <td className="px-2 py-1.5">{l.description ?? "-"}</td>
                      <td className="px-2 py-1.5 font-mono text-xs text-muted-foreground">{l.bukti}</td>
                      <td className="px-2 py-1.5 text-xs text-muted-foreground">{l.ref}</td>
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums">{l.debit ? formatRp(l.debit) : "-"}</td>
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums">{l.credit ? formatRp(l.credit) : "-"}</td>
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[var(--neon-cyan)]">{formatRp(l.running)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-secondary/50 font-semibold">
                    <td className="px-2 py-2" colSpan={mode === "konsolidasi" ? 5 : 4}>TOTAL</td>
                    <td className="px-2 py-2 text-right font-mono tabular-nums">{formatRp(data.totalDebit)}</td>
                    <td className="px-2 py-2 text-right font-mono tabular-nums">{formatRp(data.totalCredit)}</td>
                    <td className="px-2 py-2 text-right font-mono tabular-nums text-[var(--neon-cyan)]">{formatRp(data.ending)}</td>
                  </tr>
                </tfoot>
              </table>

              {pageCount > 1 && (
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Menampilkan {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, lines.length)} dari {lines.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      className="rounded-md border border-border/60 px-2 py-1 disabled:opacity-40"
                    >
                      Sebelumnya
                    </button>
                    <span className="px-2">{safePage} / {pageCount}</span>
                    <button
                      onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                      disabled={safePage === pageCount}
                      className="rounded-md border border-border/60 px-2 py-1 disabled:opacity-40"
                    >
                      Selanjutnya
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
