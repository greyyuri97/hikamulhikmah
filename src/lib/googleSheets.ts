import "server-only";
import { google, sheets_v4 } from "googleapis";
import { unstable_cache, revalidatePath, revalidateTag } from "next/cache";
import { SHEETS, SHEET_TAGS, type SheetKey } from "./sections";
import type { DarsVideo, Note, Podcast, TranscriptRow } from "./types";
import { formatTime } from "./utils";

let client: sheets_v4.Sheets | null = null;

export function sheetsConfigured() {
  return Boolean(
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL && process.env.GOOGLE_SHEETS_PRIVATE_KEY && process.env.GOOGLE_SHEET_ID,
  );
}

function getClient() {
  if (client) return client;
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    key: (process.env.GOOGLE_SHEETS_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  client = google.sheets({ version: "v4", auth });
  return client;
}

const SHEET_ID = () => process.env.GOOGLE_SHEET_ID as string;

type Row = Record<string, string> & { _row: string };

const ALL_KEYS = Object.keys(SHEETS) as SheetKey[];
const CACHE_VERSION = "v2"; // bump to orphan any poisoned cache entries from older deployments

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type RetryMode = "idempotent" | "write-once";

/**
 * Retry Google API calls with exponential backoff (1 try + up to 3 retries: ~0.5s, 1s, 2s + jitter).
 * - "idempotent" (reads, overwriting a fixed range): retry on 429, 5xx and network errors.
 * - "write-once" (append a row, delete a row, add a tab): retry ONLY on 429. Google rejects a
 *   rate-limited request before applying it, so a retry is safe; after a 5xx/timeout the first
 *   attempt may already have been applied, and repeating it could duplicate a note or delete the
 *   row that shifted into place — so those errors are surfaced instead.
 */
async function withRetry<T>(label: string, fn: () => Promise<T>, mode: RetryMode = "idempotent", retries = 3): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (process.env.SHEETS_DEBUG === "1") console.log(`[sheets-call] ${label}${attempt ? ` (retry ${attempt})` : ""}`);
      return await fn();
    } catch (e) {
      last = e;
      const code = Number((e as { code?: number; status?: number })?.code ?? (e as { status?: number })?.status) || 0;
      const retryable = mode === "idempotent" ? code === 0 || code === 429 || code >= 500 : code === 429;
      if (!retryable || attempt === retries) break;
      // 429 = per-minute quota: short waits just burn more quota, so back off harder (≈1s, 3s, 6s).
      const wait = (code === 429 ? [1000, 3000, 6000][attempt] ?? 6000 : 500 * 2 ** attempt) + Math.random() * 400;
      console.warn(`[sheets] ${label}: HTTP ${code || "network"} — retry ${attempt + 1}/${retries} in ${Math.round(wait)}ms`);
      await sleep(wait);
    }
  }
  console.error(`[sheets] ${label} failed`, last);
  throw last;
}

function parseValues(key: SheetKey, values: unknown[][]): Row[] {
  const { headers } = SHEETS[key];
  if (values.length < 2) return [];
  const head = (values[0] as string[]).map((h) => String(h).trim());
  const cols = headers.map((h) => head.indexOf(h));
  return values.slice(1).flatMap((r, i) => {
    if (!r.some((c) => String(c ?? "").trim())) return [];
    const obj: Row = { _row: String(i + 2) } as Row;
    headers.forEach((h, j) => (obj[h] = cols[j] >= 0 ? String(r[cols[j]] ?? "") : ""));
    // Rows typed by hand in the Sheet may have no id: give them a stable row-based one.
    if (!obj[headers[0]].trim()) obj[headers[0]] = `row${i + 2}`;
    return [obj];
  });
}

/** Fresh (uncached) read of ONE tab. Throws on API failure — never returns a fake empty list. */
async function readSheetRaw(key: SheetKey): Promise<Row[]> {
  if (!sheetsConfigured()) return process.env.DEMO_DATA === "1" ? (await import("./demoData")).DEMO[key] : [];
  const { name } = SHEETS[key];
  const res = await withRetry(`read ${name}`, () =>
    getClient().spreadsheets.values.get({ spreadsheetId: SHEET_ID(), range: `${name}!A:Z` }),
  );
  return parseValues(key, (res.data.values ?? []) as unknown[][]);
}

/** Fresh read of ALL tabs in a single API call (values.batchGet). */
async function readAllRaw(): Promise<Record<SheetKey, Row[]>> {
  if (!sheetsConfigured()) {
    const out = {} as Record<SheetKey, Row[]>;
    for (const k of ALL_KEYS) out[k] = await readSheetRaw(k);
    return out;
  }
  const res = await withRetry("batchGet all tabs", () =>
    getClient().spreadsheets.values.batchGet({
      spreadsheetId: SHEET_ID(),
      ranges: ALL_KEYS.map((k) => `${SHEETS[k].name}!A:Z`),
    }),
  );
  const ranges = res.data.valueRanges ?? [];
  if (ranges.length !== ALL_KEYS.length) throw new Error(`batchGet returned ${ranges.length}/${ALL_KEYS.length} ranges`);
  const out = {} as Record<SheetKey, Row[]>;
  ALL_KEYS.forEach((k, i) => (out[k] = parseValues(k, (ranges[i].values ?? []) as unknown[][])));
  return out;
}

/**
 * Cached snapshot of every tab, fetched with ONE API call and tagged with every section tag, so
 * any admin write (revalidateTag) refreshes it. Because readAllRaw THROWS on failure, Next never
 * stores a failed read in the cache. If a refresh fails we serve the last good snapshot this server
 * instance has seen; with no snapshot at all we rethrow so ISR keeps serving the previous good page
 * instead of caching an empty one.
 */
const cachedAll = unstable_cache(readAllRaw, ["sheets-all", CACHE_VERSION], {
  tags: [...ALL_KEYS.map((k) => SHEET_TAGS[k]), "all"],
  revalidate: 600,
});
let lastGood: Record<SheetKey, Row[]> | null = null;

/**
 * In-flight de-duplication: a page asks for several sections at once (Promise.all), and right after
 * a cache invalidation each of those would miss and fire its own batchGet. Sharing one pending
 * promise per server instance turns 5–10 simultaneous API calls into 1.
 */
let inflight: Promise<Record<SheetKey, Row[]>> | null = null;
function loadAll() {
  if (!inflight) inflight = cachedAll().finally(() => { inflight = null; });
  return inflight;
}

async function cachedRead(key: SheetKey): Promise<Row[]> {
  try {
    const all = await loadAll();
    lastGood = all;
    return all[key];
  } catch (e) {
    if (lastGood) {
      console.warn(`[sheets] serving last good snapshot for ${key} after read error`);
      return lastGood[key];
    }
    throw e;
  }
}

export type WithRow<T> = T & { _row: number };

export async function getNotes(key: "bukhari" | "muslim" | "fawaid"): Promise<WithRow<Note>[]> {
  const rows = await cachedRead(key);
  // Skip rows without content or id (half-filled rows typed manually in the Sheet).
  return rows
    .filter((r) => r.content?.trim())
    .map((r) => ({ note_id: r.note_id.trim(), date: (r.date ?? "").trim(), content: r.content, _row: +r._row }));
}

export async function getVideos(): Promise<WithRow<DarsVideo>[]> {
  const rows = await cachedRead("videos");
  return rows.filter((r) => /^[\w-]{11}$/.test((r.youtube_id ?? "").trim())).map((r) => ({
    video_id: r.video_id,
    youtube_id: r.youtube_id.trim(),
    title_malay: r.title_malay || r.title_arabic || "(Tanpa tajuk)",
    title_arabic: r.title_arabic,
    type: r.type || "Satu Tajuk",
    series_name: r.series_name,
    episode: Number(r.episode) || 0,
    category: r.category,
    _row: +r._row,
  }));
}

export async function getTranscripts(videoId?: string): Promise<TranscriptRow[]> {
  const rows = await cachedRead("transcripts");
  return rows
    .filter((r) => !videoId || r.video_id === videoId)
    .filter((r) => r.video_id && (r.arabic_text?.trim() || r.malay_translation?.trim()))
    .map((r) => ({
      video_id: r.video_id,
      time_seconds: Math.max(0, Math.floor(Number(r.time_seconds) || 0)),
      time_display: r.time_display?.trim() || formatTime(Math.max(0, Math.floor(Number(r.time_seconds) || 0))),
      arabic_text: r.arabic_text,
      malay_translation: r.malay_translation,
    }))
    .sort((a, b) => a.time_seconds - b.time_seconds);
}

export async function getPodcasts(): Promise<WithRow<Podcast>[]> {
  const rows = await cachedRead("podcast");
  return rows.filter((r) => /^[\w-]{11}$/.test((r.youtube_id ?? "").trim())).map((r) => ({
    podcast_id: r.podcast_id,
    youtube_url: r.youtube_url,
    youtube_id: r.youtube_id.trim(),
    title: r.title || "Podcast Hikmah",
    date_added: r.date_added,
    pdf_url: (r.pdf_url ?? "").trim(), // column may not exist yet on older sheets → ""
    _row: +r._row,
  }));
}

/* ---------------- Writes ---------------- */

function toRow(key: SheetKey, data: Record<string, unknown>) {
  return SHEETS[key].headers.map((h) => (data[h] === undefined || data[h] === null ? "" : String(data[h])));
}

function bust(key: SheetKey) {
  // The data cache is tagged per section; pages that read it re-render on next request.
  // (No revalidatePath("/", "layout") any more: purging every route at once made each page
  // re-read all tabs simultaneously and could trip Google's per-minute read quota.)
  revalidateTag(SHEET_TAGS[key]);
}

/** Admin "Muat Semula Cache": drop every cached tab + rendered page. */
export function revalidateEverything() {
  for (const k of ALL_KEYS) revalidateTag(SHEET_TAGS[k]);
  revalidateTag("all");
  revalidatePath("/", "layout");
}

/**
 * Make sure the header row contains every column the app writes (e.g. `pdf_url` added later to
 * Podcast_Hikmah). Writes are positional, so a missing header is only appended when the existing
 * headers are an exact prefix of the expected list; otherwise we leave the sheet alone and log it.
 */
const headersOk = new Set<SheetKey>();
export async function ensureHeaders(key: SheetKey): Promise<string[]> {
  if (headersOk.has(key) || !sheetsConfigured()) return [];
  const { name, headers } = SHEETS[key];
  const res = await withRetry(`header row ${name}`, () => getClient().spreadsheets.values.get({ spreadsheetId: SHEET_ID(), range: `${name}!1:1` }));
  const current = ((res.data.values?.[0] ?? []) as string[]).map((h) => String(h).trim());
  const isPrefix = current.every((h, i) => h === headers[i]);
  const missing = headers.slice(current.length);
  if (!isPrefix) {
    console.error(`[sheets] ${name}: header row differs from expected — not modifying`, { current, headers });
    headersOk.add(key);
    return [];
  }
  if (missing.length) {
    const startCol = String.fromCharCode(65 + current.length);
    await withRetry(`write headers ${name}`, () => getClient().spreadsheets.values.update({
      spreadsheetId: SHEET_ID(),
      range: `${name}!${startCol}1`,
      valueInputOption: "RAW",
      requestBody: { values: [missing] },
    }));
  }
  headersOk.add(key);
  return missing;
}

export async function appendRows(key: SheetKey, items: Record<string, unknown>[]) {
  if (!items.length) return;
  await ensureHeaders(key);
  await withRetry(`append ${SHEETS[key].name}`, () => getClient().spreadsheets.values.append({
    spreadsheetId: SHEET_ID(),
    range: `${SHEETS[key].name}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: items.map((i) => toRow(key, i)) },
  }), "write-once");
  bust(key);
}

const UNSYNCED = "Rekod ini belum mempunyai ID. Buka /admin sekali untuk menyelaraskan, kemudian cuba lagi.";

/**
 * Hand-typed rows get a temporary `rowN` id at read time. Those ids shift if a row above is
 * deleted, so they must never be used to target a write. Opening /admin calls this to give
 * every such row a permanent id (writing only the empty id cells, so row numbers never move).
 */
export async function backfillMissingIds(): Promise<number> {
  if (!sheetsConfigured()) return 0;
  return serialized(async () => {
  let total = 0;
  const all = await readAllRaw(); // one API call
  for (const key of ["bukhari", "muslim", "fawaid", "videos", "podcast"] as SheetKey[]) {
    const rows = all[key];
    const idCol = SHEETS[key].headers[0];
    const data = rows
      .filter((r) => /^row\d+$/.test(r[idCol]))
      .map((r) => ({
        range: `${SHEETS[key].name}!A${r._row}`,
        values: [[`${idCol.split("_")[0]}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`]],
      }));
    if (!data.length) continue;
    await withRetry(`backfill ids ${SHEETS[key].name}`, () => getClient().spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID(),
      requestBody: { valueInputOption: "RAW", data },
    }));
    total += data.length;
    bust(key);
  }
  return total;
  });
}

export async function updateById(key: SheetKey, id: string, patch: Record<string, unknown>) {
  return serialized(() => updateByIdUnsafe(key, id, patch));
}
async function updateByIdUnsafe(key: SheetKey, id: string, patch: Record<string, unknown>) {
  if (/^row\d+$/.test(id)) throw new Error(UNSYNCED);
  await ensureHeaders(key);
  const rows = await readSheetRaw(key);
  const idCol = SHEETS[key].headers[0];
  const matches = rows.filter((r) => r[idCol] === id);
  if (matches.length !== 1) throw new Error(matches.length ? `ID "${id}" berganda dalam Sheet` : "Rekod tidak dijumpai");
  const hit = matches[0];
  const merged: Record<string, unknown> = { ...hit, ...patch };
  const n = SHEETS[key].headers.length;
  const lastCol = String.fromCharCode(64 + n);
  await withRetry(`update ${SHEETS[key].name} row ${hit._row}`, () => getClient().spreadsheets.values.update({
    spreadsheetId: SHEET_ID(),
    range: `${SHEETS[key].name}!A${hit._row}:${lastCol}${hit._row}`,
    valueInputOption: "RAW",
    requestBody: { values: [toRow(key, merged)] },
  }));
  bust(key);
}

// Tab ids (gid) never change, so look them up once per server instance — saves a read per delete.
const gidCache = new Map<string, number>();
const cachedGids = unstable_cache(
  async () => {
    const meta = await withRetry("sheet ids", () => getClient().spreadsheets.get({ spreadsheetId: SHEET_ID(), fields: "sheets.properties(title,sheetId)" }));
    return Object.fromEntries((meta.data.sheets ?? []).map((sh) => [sh.properties?.title ?? "", sh.properties?.sheetId ?? -1]));
  },
  ["sheet-gids", CACHE_VERSION],
  { revalidate: 86400 },
);
async function sheetGid(name: string): Promise<number> {
  const cached = gidCache.get(name);
  if (cached !== undefined) return cached;
  try {
    const all = await cachedGids();
    if (typeof all[name] === "number" && all[name] >= 0) { gidCache.set(name, all[name]); return all[name]; }
  } catch { /* fall through to a direct lookup */ }
  const meta = await withRetry("sheet metadata", () => getClient().spreadsheets.get({ spreadsheetId: SHEET_ID(), fields: "sheets.properties" }));
  for (const sh of meta.data.sheets ?? []) if (sh.properties?.title && sh.properties.sheetId != null) gidCache.set(sh.properties.title, sh.properties.sheetId);
  const s = meta.data.sheets?.find((x) => x.properties?.title === name);
  if (s?.properties?.sheetId == null) throw new Error(`Tab ${name} tidak wujud`);
  return s.properties.sheetId;
}

/**
 * Serialise all mutations in this server instance. Two overlapping deletes used to each compute a
 * row number and then delete — the second hitting a row that had shifted up. Combined with the
 * client-side lock (one admin action at a time) and verifyRow() below, a delete can only ever
 * remove the row whose id it was asked to remove.
 */
let queue: Promise<unknown> = Promise.resolve();
export function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

/** Re-read just the id cells of the target rows and confirm they still hold the expected ids. */
async function verifyRows(key: SheetKey, targets: { row: number; id: string }[]) {
  const { name } = SHEETS[key];
  const res = await withRetry(`verify ${name}`, () =>
    getClient().spreadsheets.values.batchGet({
      spreadsheetId: SHEET_ID(),
      ranges: targets.map((t) => `${name}!A${t.row}`),
    }),
  );
  targets.forEach((t, i) => {
    const actual = String(res.data.valueRanges?.[i]?.values?.[0]?.[0] ?? "").trim();
    if (actual !== t.id) {
      throw new Error(`Keselamatan: baris ${t.row} kini berisi "${actual || "(kosong)"}", bukan "${t.id}". Tiada apa-apa dipadam — muat semula dan cuba lagi.`);
    }
  });
}

async function deleteRowNumbers(key: SheetKey, rowNums: number[], expectedIds?: string[]) {
  if (!rowNums.length) return;
  if (rowNums.some((r) => !Number.isInteger(r) || r < 2)) throw new Error("Nombor baris tidak sah (tidak boleh padam pengepala)");
  if (expectedIds) await verifyRows(key, rowNums.map((row, i) => ({ row, id: expectedIds[i] })));
  const gid = await sheetGid(SHEETS[key].name);
  const sorted = [...rowNums].sort((a, b) => b - a); // delete bottom-up
  await withRetry(`delete rows ${SHEETS[key].name}`, () => getClient().spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID(),
    requestBody: {
      requests: sorted.map((r) => ({
        deleteDimension: { range: { sheetId: gid, dimension: "ROWS", startIndex: r - 1, endIndex: r } },
      })),
    },
  }), "write-once");
  bust(key);
}

/** Read only the id column of a tab: [{ row, id }] for every non-empty id. */
async function readIdColumn(key: SheetKey): Promise<{ row: number; id: string }[]> {
  const { name } = SHEETS[key];
  const res = await withRetry(`ids ${name}`, () => getClient().spreadsheets.values.get({ spreadsheetId: SHEET_ID(), range: `${name}!A2:A` }));
  return ((res.data.values ?? []) as string[][]).map((r, i) => ({ row: i + 2, id: String(r?.[0] ?? "").trim() })).filter((x) => x.id);
}

/**
 * Delete several records by exact unique id with as few API calls as possible:
 *   1 read  — re-check the id cell at each row the client last saw (hint),
 *   (+1)    — only if some rows moved: read the id column (column A only) to relocate them,
 *   0–1     — tab gid (cached for a day across instances),
 *   1 write — one batchUpdate deleting every verified row bottom-up.
 * An id that is missing or appears twice is refused; nothing is ever matched by position alone.
 */
export async function deleteByIds(key: SheetKey, items: { id: string; row?: number }[]): Promise<{ deleted: string[]; missing: string[] }> {
  return serialized(async () => {
    const { name } = SHEETS[key];
    const wanted = [...new Map(items.map((x) => [x.id, x])).values()];
    if (wanted.some((x) => /^row\d+$/.test(x.id))) throw new Error(UNSYNCED);
    const resolved = new Map<string, number>();

    // 1) cheap path: verify the row hints in one batchGet
    const hinted = wanted.filter((x) => Number.isInteger(x.row) && (x.row as number) >= 2);
    if (hinted.length) {
      const res = await withRetry(`verify ${name}`, () =>
        getClient().spreadsheets.values.batchGet({ spreadsheetId: SHEET_ID(), ranges: hinted.map((x) => `${name}!A${x.row}`) }),
      );
      hinted.forEach((x, i) => {
        if (String(res.data.valueRanges?.[i]?.values?.[0]?.[0] ?? "").trim() === x.id) resolved.set(x.id, x.row as number);
      });
    }
    // 2) relocate anything that moved / had no hint, using the id column only
    const missing: string[] = [];
    const unresolved = wanted.filter((x) => !resolved.has(x.id));
    if (unresolved.length) {
      const col = await readIdColumn(key);
      for (const x of unresolved) {
        const hits = col.filter((c) => c.id === x.id);
        if (hits.length > 1) throw new Error(`ID "${x.id}" muncul ${hits.length} kali dalam Sheet — betulkan secara manual dahulu.`);
        if (hits.length === 1) resolved.set(x.id, hits[0].row); else missing.push(x.id);
      }
    }
    // Also refuse if a verified id exists twice elsewhere — only checked when we had to read column A.
    const rows = [...resolved.values()];
    if (new Set(rows).size !== rows.length) throw new Error("Dua ID merujuk baris yang sama — tiada apa-apa dipadam.");
    if (rows.length) {
      await deleteRowNumbers(key, rows); // ids already verified above in this same serialised step
    }
    return { deleted: [...resolved.keys()], missing };
  });
}

export async function deleteById(key: SheetKey, id: string, rowHint?: number) {
  const r = await deleteByIds(key, [{ id, row: rowHint }]);
  if (r.missing.length) throw new Error("Rekod tidak dijumpai (mungkin sudah dipadam). Muat semula halaman.");
}

export async function deleteTranscriptsFor(videoId: string) {
  return serialized(async () => {
    const hits = (await readIdColumn("transcripts")).filter((r) => r.id === videoId);
    await deleteRowNumbers("transcripts", hits.map((r) => r.row), hits.map(() => videoId));
  });
}

/** Create any missing tabs and write header rows. Used by /api/admin/setup and scripts/setup-sheets.mjs */
export async function ensureTabs() {
  const meta = await withRetry("ensureTabs metadata", () => getClient().spreadsheets.get({ spreadsheetId: SHEET_ID(), fields: "sheets.properties" }));
  const existing = new Set(meta.data.sheets?.map((s) => s.properties?.title));
  const missing = Object.values(SHEETS).filter((s) => !existing.has(s.name));
  if (missing.length) {
    await withRetry("add missing tabs", () => getClient().spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID(),
      requestBody: { requests: missing.map((s) => ({ addSheet: { properties: { title: s.name } } })) },
    }), "write-once");
  }
  await withRetry("write header rows", () => getClient().spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID(),
    requestBody: {
      valueInputOption: "RAW",
      data: Object.values(SHEETS).map((s) => ({ range: `${s.name}!A1`, values: [[...s.headers]] })),
    },
  }));
  revalidateTag("all");
  return missing.map((m) => m.name);
}

/* ------------------------------------------------------------------------------------------ *
 * Scheduled health check & self-clean (called by /api/cron/health-clean)
 * ------------------------------------------------------------------------------------------ */

export interface TabHealth {
  tab: string;
  ok: boolean;
  dataRows: number;
  header: "ok" | "repaired" | "mismatch";
  missingHeaders?: string[];
  blankRowsRemoved: number;
  rowsWithoutId: number;
  duplicateIds: string[];
  note?: string;
}
export interface HealthReport {
  ok: boolean;
  checkedAt: string;
  durationMs: number;
  tabs: TabHealth[];
  revalidated: boolean;
  error?: string;
}

const MAX_BLANK_DELETES = 200; // per tab per run — a safety cap, never a whole-range clear

const isBlankRow = (r: unknown[] | undefined) => !r || r.every((c) => String(c ?? "").trim() === "");

/**
 * 1. Connectivity: one batchGet of every tab (also proves the credentials + sheet id work).
 * 2. Header integrity: exact → ok; prefix of expected → missing columns appended; otherwise
 *    "mismatch" is reported and that tab is NOT modified (writes are positional).
 * 3. Self-clean: delete only rows that are completely blank AND lie between the header and the
 *    last non-blank row; each is re-verified blank right before a single bottom-up delete.
 * 4. Revalidate every cache tag so the public site re-reads fresh data.
 */
export async function runHealthClean(): Promise<HealthReport> {
  const started = Date.now();
  const report: HealthReport = { ok: true, checkedAt: new Date().toISOString(), durationMs: 0, tabs: [], revalidated: false };
  if (!sheetsConfigured()) {
    return { ...report, ok: false, error: "Google Sheets is not configured", durationMs: Date.now() - started };
  }
  return serialized(async () => {
    try {
      const res = await withRetry("health batchGet", () =>
        getClient().spreadsheets.values.batchGet({ spreadsheetId: SHEET_ID(), ranges: ALL_KEYS.map((k) => `${SHEETS[k].name}!A:Z`) }),
      );
      const ranges = res.data.valueRanges ?? [];

      for (const [i, key] of ALL_KEYS.entries()) {
        const { name, headers } = SHEETS[key];
        const values = (ranges[i]?.values ?? []) as unknown[][];
        const head = ((values[0] ?? []) as string[]).map((h) => String(h ?? "").trim());
        const t: TabHealth = { tab: name, ok: true, dataRows: 0, header: "ok", blankRowsRemoved: 0, rowsWithoutId: 0, duplicateIds: [] };

        // --- header integrity
        const exact = headers.every((h, j) => head[j] === h) && head.filter(Boolean).length === headers.length;
        const prefix = head.every((h, j) => h === headers[j]);
        if (!exact) {
          if (prefix) {
            headersOk.delete(key);
            t.missingHeaders = await ensureHeaders(key);
            t.header = "repaired";
          } else {
            t.header = "mismatch";
            t.ok = false;
            t.note = `Header is ${JSON.stringify(head)}; expected ${JSON.stringify(headers)}. Tab left untouched.`;
          }
        }

        // --- data stats
        let lastNonBlank = 0; // 0-based index into values
        values.forEach((r, idx) => { if (idx > 0 && !isBlankRow(r)) lastNonBlank = idx; });
        const dataRows = values.slice(1, lastNonBlank + 1).filter((r) => !isBlankRow(r));
        t.dataRows = dataRows.length;
        const ids = dataRows.map((r) => String(r[0] ?? "").trim());
        t.rowsWithoutId = ids.filter((x) => !x).length;
        const seen = new Set<string>();
        t.duplicateIds = [...new Set(ids.filter((x) => x && (seen.has(x) || !seen.add(x))))];
        if (t.duplicateIds.length) t.ok = false;

        // --- self-clean: blank rows inside the data block (sheet row = idx + 1)
        if (t.header !== "mismatch") {
          const blanks: number[] = [];
          for (let idx = 1; idx < lastNonBlank; idx++) if (isBlankRow(values[idx])) blanks.push(idx + 1);
          const targets = blanks.slice(0, MAX_BLANK_DELETES);
          if (targets.length) {
            // Re-verify every target is still blank immediately before deleting.
            const lastCol = String.fromCharCode(64 + Math.max(headers.length, head.length, 1));
            const check = await withRetry(`verify blanks ${name}`, () =>
              getClient().spreadsheets.values.batchGet({ spreadsheetId: SHEET_ID(), ranges: targets.map((r) => `${name}!A${r}:${lastCol}${r}`) }),
            );
            const stillBlank = targets.filter((_, n) => isBlankRow(check.data.valueRanges?.[n]?.values?.[0] as unknown[] | undefined));
            if (stillBlank.length) {
              const gid = await sheetGid(name);
              await withRetry(`trim blank rows ${name}`, () =>
                getClient().spreadsheets.batchUpdate({
                  spreadsheetId: SHEET_ID(),
                  requestBody: {
                    requests: [...stillBlank].sort((a, b) => b - a).map((r) => ({
                      deleteDimension: { range: { sheetId: gid, dimension: "ROWS", startIndex: r - 1, endIndex: r } },
                    })),
                  },
                }), "write-once");
              t.blankRowsRemoved = stillBlank.length;
            }
            if (blanks.length > MAX_BLANK_DELETES) t.note = `${blanks.length - MAX_BLANK_DELETES} more blank rows left for the next run.`;
          }
        }
        if (!t.ok) report.ok = false;
        report.tabs.push(t);
      }
    } catch (e) {
      report.ok = false;
      report.error = e instanceof Error ? e.message : String(e);
    }
    // Revalidate even on partial failure: reads never cache errors, so this can only help.
    revalidateEverything();
    report.revalidated = true;
    report.durationMs = Date.now() - started;
    return report;
  });
}
