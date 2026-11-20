"use server";
import { isAdmin } from "./auth";
import {
  appendRows, deleteById, deleteTranscriptsFor, ensureTabs, sheetsConfigured, updateById,
} from "./googleSheets";
import type { SheetKey } from "./sections";
import { extractYoutubeId, newId, todayISO } from "./utils";
import type { ParsedRow } from "./transcriptParser";

type Result = { ok: true; id?: string } | { ok: false; error: string };

async function guard<T>(fn: () => Promise<T>): Promise<Result> {
  if (!(await isAdmin())) return { ok: false, error: "Sesi admin tamat. Sila log masuk semula." };
  if (!sheetsConfigured()) return { ok: false, error: "Google Sheets belum dikonfigurasi (.env.local)." };
  try {
    const r = await fn();
    return { ok: true, id: typeof r === "string" ? r : undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Ralat tidak diketahui" };
  }
}

const NOTE_KEYS = ["bukhari", "muslim", "fawaid"] as const;
type NoteKey = (typeof NOTE_KEYS)[number];
const validNote = (k: string): k is NoteKey => (NOTE_KEYS as readonly string[]).includes(k);

export async function addNote(section: string, date: string, content: string) {
  return guard(async () => {
    if (!validNote(section)) throw new Error("Seksyen tidak sah");
    if (!content.trim()) throw new Error("Kandungan kosong");
    const id = newId(section.slice(0, 3));
    await appendRows(section, [{ note_id: id, date: date || todayISO(), content }]);
    return id;
  });
}

export async function updateNote(section: string, id: string, date: string, content: string) {
  return guard(async () => {
    if (!validNote(section)) throw new Error("Seksyen tidak sah");
    await updateById(section, id, { date, content });
  });
}

export async function deleteRecord(key: SheetKey, id: string) {
  return guard(async () => {
    if (key === "transcripts") throw new Error("Tidak dibenarkan");
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
    if (!yt) throw new Error("URL YouTube tidak sah");
    if (!v.title_malay.trim()) throw new Error("Tajuk Melayu diperlukan");
    const video_id = replaceId || newId("vid");
    const record = {
      video_id,
      youtube_id: yt,
      title_malay: v.title_malay,
      title_arabic: v.title_arabic,
      type: v.type === "Bersiri" ? "Bersiri" : "Satu Tajuk",
      series_name: v.type === "Bersiri" ? v.series_name : "",
      episode: v.type === "Bersiri" ? v.episode || 1 : "",
      category: v.category,
    };
    if (replaceId) {
      await updateById("videos", replaceId, record);
      await deleteTranscriptsFor(replaceId);
    } else {
      await appendRows("videos", [record]);
    }
    await appendRows("transcripts", rows.map((r) => ({ video_id, ...r })));
    return video_id;
  });
}

export async function addPodcast(url: string, title: string) {
  return guard(async () => {
    const yt = extractYoutubeId(url);
    if (!yt) throw new Error("URL YouTube tidak sah");
    const id = newId("pod");
    await appendRows("podcast", [
      { podcast_id: id, youtube_url: url, youtube_id: yt, title: title || "Podcast Hikmah", date_added: todayISO() },
    ]);
    return id;
  });
}

export async function setupTabs() {
  return guard(async () => {
    const created = await ensureTabs();
    return created.join(", ") || "semua tab sudah wujud";
  });
}
