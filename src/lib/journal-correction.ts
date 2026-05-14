import { supabase } from "@/integrations/supabase/client";

export type CorrectionType =
  | "reversal"
  | "adjust_amount"
  | "reclass"
  | "full_adjustment";

export type JournalLine = {
  id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  line_order: number;
};

export type JournalEntry = {
  id: string;
  transaction_date: string;
  transaction_type: string;
  description: string | null;
  total_amount: number;
  status: string;
  original_journal_id: string | null;
  correction_type: string | null;
  correction_reason: string | null;
  created_at: string;
  lines: JournalLine[];
};

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

export async function fetchJournalWithLines(id: string): Promise<JournalEntry> {
  const { data: entry, error: e1 } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("id", id)
    .single();
  if (e1) throw e1;
  const { data: lines, error: e2 } = await supabase
    .from("journal_entry_lines")
    .select("*")
    .eq("journal_entry_id", id)
    .order("line_order", { ascending: true });
  if (e2) throw e2;
  return {
    ...(entry as unknown as Omit<JournalEntry, "lines">),
    lines: (lines ?? []) as unknown as JournalLine[],
  };
}

type NewLine = {
  account_id: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
};

async function insertCorrectionEntry(opts: {
  originalId: string;
  date: string;
  description: string;
  correctionType: CorrectionType;
  reason: string;
  lines: NewLine[];
}): Promise<string> {
  const total = opts.lines.reduce((s, l) => s + num(l.debit), 0);

  // Validasi balanced
  const totalC = opts.lines.reduce((s, l) => s + num(l.credit), 0);
  if (Math.round(total) !== Math.round(totalC)) {
    throw new Error("Jurnal tidak balance: total debit ≠ total kredit.");
  }
  if (opts.lines.length < 2) {
    throw new Error("Jurnal harus memiliki minimal 2 baris.");
  }

  const { data: entry, error: e1 } = await supabase
    .from("journal_entries")
    .insert({
      transaction_date: opts.date,
      transaction_type: "KOREKSI",
      description: opts.description,
      total_amount: total,
      original_journal_id: opts.originalId,
      correction_type: opts.correctionType,
      correction_reason: opts.reason,
      status: "Posted",
    })
    .select("id")
    .single();
  if (e1) throw e1;

  const newId = (entry as { id: string }).id;

  const linesPayload = opts.lines.map((l, idx) => ({
    journal_entry_id: newId,
    account_id: l.account_id,
    account_code: l.account_code,
    account_name: l.account_name,
    debit: num(l.debit),
    credit: num(l.credit),
    line_order: idx,
  }));

  const { error: e2 } = await supabase
    .from("journal_entry_lines")
    .insert(linesPayload);
  if (e2) throw e2;

  // Tandai jurnal lama sebagai Corrected
  const { error: e3 } = await supabase
    .from("journal_entries")
    .update({ status: "Corrected" })
    .eq("id", opts.originalId);
  if (e3) throw e3;

  return newId;
}

function ensureNotCorrected(entry: JournalEntry) {
  if (entry.status === "Corrected") {
    throw new Error("Jurnal ini sudah dikoreksi sebelumnya.");
  }
}

/** 1. REVERSAL — balik 100% debit ↔ kredit. */
export async function createReversal(opts: {
  journalId: string;
  reason: string;
  date: string;
}): Promise<string> {
  const orig = await fetchJournalWithLines(opts.journalId);
  ensureNotCorrected(orig);
  const lines: NewLine[] = orig.lines.map((l) => ({
    account_id: l.account_id,
    account_code: l.account_code,
    account_name: l.account_name,
    debit: num(l.credit),
    credit: num(l.debit),
  }));
  return insertCorrectionEntry({
    originalId: orig.id,
    date: opts.date,
    description: `Pembalik: ${orig.description ?? orig.transaction_type}`,
    correctionType: "reversal",
    reason: opts.reason,
    lines,
  });
}

/** 2. ADJUST AMOUNT — koreksi nominal proporsional. */
export async function createAmountAdjustment(opts: {
  journalId: string;
  newAmount: number;
  reason: string;
  date: string;
}): Promise<string> {
  const orig = await fetchJournalWithLines(opts.journalId);
  ensureNotCorrected(orig);

  const oldTotal = num(orig.total_amount);
  if (oldTotal <= 0) throw new Error("Total jurnal asli tidak valid.");
  const newAmount = num(opts.newAmount);
  const delta = newAmount - oldTotal;
  if (delta === 0) throw new Error("Nominal baru sama dengan nominal lama.");

  const swap = delta < 0;
  const absScale = Math.abs(delta) / oldTotal;

  const lines: NewLine[] = orig.lines.map((l) => {
    const d = num(l.debit) * absScale;
    const c = num(l.credit) * absScale;
    return {
      account_id: l.account_id,
      account_code: l.account_code,
      account_name: l.account_name,
      debit: swap ? c : d,
      credit: swap ? d : c,
    };
  });

  return insertCorrectionEntry({
    originalId: orig.id,
    date: opts.date,
    description: `Koreksi nominal: ${orig.description ?? orig.transaction_type}`,
    correctionType: "adjust_amount",
    reason: opts.reason,
    lines,
  });
}

/** 3. RECLASS — pindah satu baris ke akun lain. */
export async function createReclass(opts: {
  journalId: string;
  lineId: string;
  newAccountId: string;
  reason: string;
  date: string;
}): Promise<string> {
  const orig = await fetchJournalWithLines(opts.journalId);
  ensureNotCorrected(orig);
  const line = orig.lines.find((l) => l.id === opts.lineId);
  if (!line) throw new Error("Baris jurnal tidak ditemukan.");

  const { data: acc, error } = await supabase
    .from("coa_accounts")
    .select("id,code,name")
    .eq("id", opts.newAccountId)
    .single();
  if (error) throw error;
  const newAcc = acc as { id: string; code: string; name: string };

  const isDebitLine = num(line.debit) > 0;
  const amount = isDebitLine ? num(line.debit) : num(line.credit);

  const lines: NewLine[] = isDebitLine
    ? [
        {
          account_id: newAcc.id,
          account_code: newAcc.code,
          account_name: newAcc.name,
          debit: amount,
          credit: 0,
        },
        {
          account_id: line.account_id,
          account_code: line.account_code,
          account_name: line.account_name,
          debit: 0,
          credit: amount,
        },
      ]
    : [
        {
          account_id: line.account_id,
          account_code: line.account_code,
          account_name: line.account_name,
          debit: amount,
          credit: 0,
        },
        {
          account_id: newAcc.id,
          account_code: newAcc.code,
          account_name: newAcc.name,
          debit: 0,
          credit: amount,
        },
      ];

  return insertCorrectionEntry({
    originalId: orig.id,
    date: opts.date,
    description: `Reklasifikasi: ${line.account_code} → ${newAcc.code}`,
    correctionType: "reclass",
    reason: opts.reason,
    lines,
  });
}

/** 4. FULL ADJUSTMENT — user tentukan baris bebas. */
export async function createFullAdjustment(opts: {
  journalId: string;
  lines: NewLine[];
  reason: string;
  date: string;
  description?: string;
}): Promise<string> {
  const orig = await fetchJournalWithLines(opts.journalId);
  ensureNotCorrected(orig);
  return insertCorrectionEntry({
    originalId: orig.id,
    date: opts.date,
    description:
      opts.description ?? `Koreksi gabungan: ${orig.description ?? orig.transaction_type}`,
    correctionType: "full_adjustment",
    reason: opts.reason,
    lines: opts.lines,
  });
}
