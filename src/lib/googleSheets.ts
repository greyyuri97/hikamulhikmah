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

/** Raw read: returns objects keyed by header, with _row = 1-based sheet row number. */
async function readSheetRaw(key: SheetKey): Promise<Row[]> {
  if (!sheetsConfigured()) return process.env.DEMO_DATA === "1" ? (await import("./demoData")).DEMO[key] : [];
  const { name, headers } = SHEETS[key];
  try {
    const res = await getClient().spreadsheets.values.get({ spreadsheetId: SHEET_ID(), range: `${name}!A:Z` });
    const values = res.data.values ?? [];
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
  } catch (e) {
    console.error(`[sheets] read ${name} failed`, e);
    return [];
  }
}

const cachedRead = (key: SheetKey) =>
  unstable_cache(() => readSheetRaw(key), ["sheet", key], { tags: [SHEET_TAGS[key], "all"], revalidate: 600 })();

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
    _row: +r._row,
  }));
}

/* ---------------- Writes ---------------- */

function toRow(key: SheetKey, data: Record<string, unknown>) {
  return SHEETS[key].headers.map((h) => (data[h] === undefined || data[h] === null ? "" : String(data[h])));
}

function bust(key: SheetKey) {
  revalidateTag(SHEET_TAGS[key]);
  // Belt & braces: also drop the rendered route cache so ISR pages (/, /podcast-hikmah …)
  // never serve a stale copy after an admin create/edit/delete.
  revalidatePath("/", "layout");
}

export async function appendRows(key: SheetKey, items: Record<string, unknown>[]) {
  if (!items.length) return;
  await getClient().spreadsheets.values.append({
    spreadsheetId: SHEET_ID(),
    range: `${SHEETS[key].name}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: items.map((i) => toRow(key, i)) },
  });
  bust(key);
}

/** Locate the row for an id (fresh, uncached) to avoid stale row numbers. */
async function findRow(key: SheetKey, id: string): Promise<number | null> {
  if (/^row\d+$/.test(id)) throw new Error(UNSYNCED);
  const idCol = SHEETS[key].headers[0];
  const rows = await readSheetRaw(key);
  const hit = rows.find((r) => r[idCol] === id);
  return hit ? Number(hit._row) : null;
}

const UNSYNCED = "Rekod ini belum mempunyai ID. Buka /admin sekali untuk menyelaraskan, kemudian cuba lagi.";

/**
 * Hand-typed rows get a temporary `rowN` id at read time. Those ids shift if a row above is
 * deleted, so they must never be used to target a write. Opening /admin calls this to give
 * every such row a permanent id (writing only the empty id cells, so row numbers never move).
 */
export async function backfillMissingIds(): Promise<number> {
  if (!sheetsConfigured()) return 0;
  let total = 0;
  for (const key of ["bukhari", "muslim", "fawaid", "videos", "podcast"] as SheetKey[]) {
    const rows = await readSheetRaw(key);
    const idCol = SHEETS[key].headers[0];
    const data = rows
      .filter((r) => /^row\d+$/.test(r[idCol]))
      .map((r) => ({
        range: `${SHEETS[key].name}!A${r._row}`,
        values: [[`${idCol.split("_")[0]}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`]],
      }));
    if (!data.length) continue;
    await getClient().spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID(),
      requestBody: { valueInputOption: "RAW", data },
    });
    total += data.length;
    bust(key);
  }
  return total;
}

export async function updateById(key: SheetKey, id: string, patch: Record<string, unknown>) {
  if (/^row\d+$/.test(id)) throw new Error(UNSYNCED);
  const rows = await readSheetRaw(key);
  const idCol = SHEETS[key].headers[0];
  const hit = rows.find((r) => r[idCol] === id);
  if (!hit) throw new Error("Rekod tidak dijumpai");
  const merged: Record<string, unknown> = { ...hit, ...patch };
  const n = SHEETS[key].headers.length;
  const lastCol = String.fromCharCode(64 + n);
  await getClient().spreadsheets.values.update({
    spreadsheetId: SHEET_ID(),
    range: `${SHEETS[key].name}!A${hit._row}:${lastCol}${hit._row}`,
    valueInputOption: "RAW",
    requestBody: { values: [toRow(key, merged)] },
  });
  bust(key);
}

async function sheetGid(name: string): Promise<number> {
  const meta = await getClient().spreadsheets.get({ spreadsheetId: SHEET_ID(), fields: "sheets.properties" });
  const s = meta.data.sheets?.find((x) => x.properties?.title === name);
  if (s?.properties?.sheetId == null) throw new Error(`Tab ${name} tidak wujud`);
  return s.properties.sheetId;
}

async function deleteRowNumbers(key: SheetKey, rowNums: number[]) {
  if (!rowNums.length) return;
  const gid = await sheetGid(SHEETS[key].name);
  const sorted = [...rowNums].sort((a, b) => b - a); // delete bottom-up
  await getClient().spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID(),
    requestBody: {
      requests: sorted.map((r) => ({
        deleteDimension: { range: { sheetId: gid, dimension: "ROWS", startIndex: r - 1, endIndex: r } },
      })),
    },
  });
  bust(key);
}

export async function deleteById(key: SheetKey, id: string) {
  const row = await findRow(key, id);
  if (!row) throw new Error("Rekod tidak dijumpai");
  await deleteRowNumbers(key, [row]);
}

export async function deleteTranscriptsFor(videoId: string) {
  const rows = await readSheetRaw("transcripts");
  await deleteRowNumbers(
    "transcripts",
    rows.filter((r) => r.video_id === videoId).map((r) => Number(r._row)),
  );
}

/** Create any missing tabs and write header rows. Used by /api/admin/setup and scripts/setup-sheets.mjs */
export async function ensureTabs() {
  const meta = await getClient().spreadsheets.get({ spreadsheetId: SHEET_ID(), fields: "sheets.properties" });
  const existing = new Set(meta.data.sheets?.map((s) => s.properties?.title));
  const missing = Object.values(SHEETS).filter((s) => !existing.has(s.name));
  if (missing.length) {
    await getClient().spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID(),
      requestBody: { requests: missing.map((s) => ({ addSheet: { properties: { title: s.name } } })) },
    });
  }
  await getClient().spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID(),
    requestBody: {
      valueInputOption: "RAW",
      data: Object.values(SHEETS).map((s) => ({ range: `${s.name}!A1`, values: [[...s.headers]] })),
    },
  });
  revalidateTag("all");
  return missing.map((m) => m.name);
}
