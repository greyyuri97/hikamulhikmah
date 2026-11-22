"use server";
import { isAdmin } from "./auth";
import {
  appendRows, backfillMissingIds, deleteById, ensureHeaders, revalidateEverything, deleteTranscriptsFor, ensureTabs, sheetsConfigured, updateById,
} from "./googleSheets";
import type { SheetKey } from "./sections";
import { extractYoutubeId, formatTime, isPlaylistOnly, newId, toISODate, todayISO } from "./utils";
import { cleanText, isSafeId } from "./sanitize";
import { parsePdfLink } from "./pdfLink";
import type { ParsedRow } from "./transcriptParser";

type Result = { ok: true; id?: string } | { ok: false; error: string; status?: number };

/**
 * Every mutation goes through guard(): the signed HTTP-only admin cookie is verified on the
 * server for EACH call (server actions are public POST endpoints, so the UI hiding a button is
 * not protection). Missing/expired/tampered cookie → { ok:false, status:401 } and nothing is written.
 */
async function guard<T>(fn: () => Promise<T>): Promise<Result> {
  if (!(await isAdmin())) return { ok: false, status: 401, error: "Sesi admin tamat. Sila log masuk semula." };
  if (!sheetsConfigured()) return { ok: false, error: "Google Sheets belum dikonfigurasi (.env.local)." };
  try {
    const r = await fn();
    return { ok: true, id: typeof r === "string" ? r : undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Ralat tidak diketahui" };
  }
}

function youtubeError(url: string) {
  return isPlaylistOnly(url)
    ? "Ini pautan playlist — sila tampal pautan video tunggal (watch?v=… atau youtu.be/…)"
    : "URL YouTube tidak sah";
}

/** Always store YYYY-MM-DD; empty → today (Malaysia time); garbage → error. */
function cleanDate(input: string) {
  if (!input?.trim()) return todayISO();
  const iso = toISODate(input);
  if (!iso) throw new Error("Tarikh tidak sah — sila pilih dari kalendar");
  return iso;
}

const NOTE_KEYS = ["bukhari", "muslim", "fawaid"] as const;
type NoteKey = (typeof NOTE_KEYS)[number];
const validNote = (k: string): k is NoteKey => (NOTE_KEYS as readonly string[]).includes(k);

export async function addNote(section: string, date: string, content: string) {
  return guard(async () => {
    if (!validNote(section)) throw new Error("Seksyen tidak sah");
    const body = cleanText(content, 50_000);
    if (!body) throw new Error("Kandungan kosong");
    const id = newId(section.slice(0, 3));
    await appendRows(section, [{ note_id: id, date: cleanDate(date), content: body }]);
    return id;
  });
}

export async function updateNote(section: string, id: string, date: string, content: string) {
  return guard(async () => {
    if (!validNote(section)) throw new Error("Seksyen tidak sah");
    if (!isSafeId(id)) throw new Error("ID tidak sah");
    const body = cleanText(content, 50_000);
    if (!body) throw new Error("Kandungan kosong");
    await updateById(section, id, { date: cleanDate(date), content: body });
  });
}

export async function deleteRecord(key: SheetKey, id: string) {
  return guard(async () => {
    if (!["bukhari", "muslim", "fawaid", "videos", "podcast"].includes(key)) throw new Error("Tidak dibenarkan");
    if (!isSafeId(id)) throw new Error("ID tidak sah");
    if (key === "videos") await deleteTranscriptsFor(id);
    await deleteById(key, id);
  });
}

export interface VideoInput {
  youtube_url: string;
  title_malay: string;
  title_arabic: string;
  type: string;
  series_name: string;
  episode: number;
  category: string;
}

export async function publishVideo(v: VideoInput, rows: ParsedRow[], replaceId?: string) {
  return guard(async () => {
    const yt = extractYoutubeId(v.youtube_url);
    if (!yt) throw new Error(youtubeError(v.youtube_url));
    const titleMs = cleanText(v.title_malay, 300);
    if (!titleMs) throw new Error("Tajuk Melayu diperlukan");
    if (replaceId && !isSafeId(replaceId)) throw new Error("ID tidak sah");
    if (!Array.isArray(rows) || rows.length > 5000) throw new Error("Transkrip tidak sah (maks 5000 baris)");
    const episode = Math.max(1, Math.min(9999, Math.floor(Number(v.episode) || 1)));
    const video_id = replaceId || newId("vid");
    const record = {
      video_id,
      youtube_id: yt,
      title_malay: titleMs,
      title_arabic: cleanText(v.title_arabic, 300),
      type: v.type === "Bersiri" ? "Bersiri" : "Satu Tajuk",
      series_name: v.type === "Bersiri" ? cleanText(v.series_name, 200) : "",
      episode: v.type === "Bersiri" ? episode : "",
      category: cleanText(v.category, 60),
    };
    if (replaceId) {
      await updateById("videos", replaceId, record);
      await deleteTranscriptsFor(replaceId);
    } else {
      await appendRows("videos", [record]);
    }
    const safeRows = rows.map((r) => {
      const t = Math.max(0, Math.floor(Number(r.time_seconds) || 0));
      return {
        video_id,
        time_seconds: t,
        time_display: cleanText(r.time_display, 12) || formatTime(t),
        arabic_text: cleanText(r.arabic_text, 5000),
        malay_translation: cleanText(r.malay_translation, 5000),
      };
    });
    await appendRows("transcripts", safeRows);
    return video_id;
  });
}

/** "" → no PDF; otherwise must be a recognised Drive/Docs link or an https URL. */
function cleanPdf(input?: string) {
  const s = cleanText(input, 2000);
  if (!s) return "";
  const p = parsePdfLink(s);
  if (!p) throw new Error("Pautan PDF tidak sah — guna pautan Google Drive atau URL https://…");
  return p.canonical;
}

export async function updatePodcast(id: string, url: string, title: string, dateAdded: string, pdfUrl?: string) {
  return guard(async () => {
    if (!isSafeId(id)) throw new Error("ID tidak sah");
    const yt = extractYoutubeId(url);
    if (!yt) throw new Error(youtubeError(url));
    await updateById("podcast", id, {
      youtube_url: `https://www.youtube.com/watch?v=${yt}`,
      youtube_id: yt,
      title: cleanText(title, 300) || "Podcast Hikmah",
      date_added: cleanDate(dateAdded),
      pdf_url: cleanPdf(pdfUrl),
    });
  });
}

export async function addPodcast(url: string, title: string, dateAdded?: string, pdfUrl?: string) {
  return guard(async () => {
    const yt = extractYoutubeId(url);
    if (!yt) throw new Error(youtubeError(url));
    const id = newId("pod");
    await appendRows("podcast", [
      { podcast_id: id, youtube_url: `https://www.youtube.com/watch?v=${yt}`, youtube_id: yt, title: cleanText(title, 300) || "Podcast Hikmah", date_added: cleanDate(dateAdded ?? ""), pdf_url: cleanPdf(pdfUrl) },
    ]);
    return id;
  });
}

/** Give hand-typed Sheet rows a permanent id (run automatically when the dashboard opens). */
export async function syncIds() {
  return guard(async () => {
    await ensureHeaders("podcast"); // adds the `pdf_url` column header on older sheets
    return String(await backfillMissingIds());
  });
}

/** Admin button "Muat Semula Cache": force every section to re-read the Sheet. */
export async function refreshCache() {
  return guard(async () => {
    revalidateEverything();
  });
}

export async function setupTabs() {
  return guard(async () => {
    const created = await ensureTabs();
    return created.join(", ") || "semua tab sudah wujud";
  });
}
