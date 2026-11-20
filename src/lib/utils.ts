/**
 * Extract an 11-char video id from any common YouTube link:
 * watch?v=, &v= (playlist links that include a video), youtu.be/, shorts/, live/, embed/, v/,
 * m./music./www. hosts, youtube-nocookie.com, missing scheme, trailing params/fragments.
 * Returns null for playlist-only / channel / garbage links.
 */
export function extractYoutubeId(input: string | null | undefined): string | null {
  const s = String(input ?? "").trim();
  if (!s) return null;
  if (/^[\w-]{11}$/.test(s)) return s;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "");
  const ok = (id: string | null | undefined) => (id && /^[\w-]{11}$/.test(id) ? id : null);
  if (host === "youtu.be") return ok(url.pathname.split("/")[1]);
  if (host !== "youtube.com" && host !== "youtube-nocookie.com") return null;
  const v = ok(url.searchParams.get("v"));
  if (v) return v;
  const m = url.pathname.match(/^\/(?:shorts|live|embed|v|e)\/([\w-]{11})/);
  return m ? m[1] : null;
}

export function isPlaylistOnly(input: string): boolean {
  return /[?&]list=/.test(input) && !extractYoutubeId(input);
}

export function ytThumb(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function toSeconds(ts: string): number | null {
  const parts = ts.trim().split(":").map((p) => p.replace(",", "."));
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => p === "" || isNaN(Number(p)))) return null;
  const n = parts.map(Number);
  return Math.floor(n.length === 3 ? n[0] * 3600 + n[1] * 60 + n[2] : n[0] * 60 + n[1]);
}

export function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const pad = (x: number) => String(x).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/g;
export function isArabic(text: string): boolean {
  const letters = text.replace(/[\s\d\p{P}]/gu, "");
  if (!letters) return false;
  return (letters.match(ARABIC_RE)?.length ?? 0) / letters.length > 0.5;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const isoOf = (y: number, m: number, d: number) => `${y}-${pad2(m)}-${pad2(d)}`;
const valid = (y: number, m: number, d: number) => {
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
};

/**
 * Normalise any date string we may meet (YYYY-MM-DD, YYYY/M/D, DD/MM/YYYY, DD-MM-YYYY,
 * "21 Nov 2026", ISO timestamps) to canonical YYYY-MM-DD. Returns "" if unparseable.
 */
export function toISODate(input: string | null | undefined): string {
  const s = String(input ?? "").trim();
  if (!s) return "";
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m && valid(+m[1], +m[2], +m[3])) return isoOf(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/); // Malaysian order: day first
  if (m && valid(+m[3], +m[2], +m[1])) return isoOf(+m[3], +m[2], +m[1]);
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\.?\s+(\d{4})$/);
  if (m) {
    const mi = monthIndex(m[2]);
    if (mi >= 0 && valid(+m[3], mi + 1, +m[1])) return isoOf(+m[3], mi + 1, +m[1]);
  }
  return "";
}

/** Parse a stored date into a local-time sortable timestamp (0 if unknown). */
export function dateValue(d: string): number {
  const iso = toISODate(d);
  if (!iso) return 0;
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(y, m - 1, day).getTime();
}

export const BULAN = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];
const MONTH_ALIASES = [
  ["jan"], ["feb"], ["mac", "mar"], ["apr"], ["mei", "may"], ["jun"],
  ["jul"], ["ogo", "aug"], ["sep"], ["okt", "oct"], ["nov"], ["dis", "dec"],
];
function monthIndex(name: string) {
  const k = name.slice(0, 3).toLowerCase();
  return MONTH_ALIASES.findIndex((a) => a.includes(k));
}

/** "2026-11-21" → "21 Nov 2026" (Malay month abbreviations). Falls back to the raw value. */
export function formatDateMs(d: string): string {
  const iso = toISODate(d);
  if (!iso) return d || "";
  const [y, m, day] = iso.split("-").map(Number);
  return `${day} ${BULAN[m - 1]} ${y}`;
}

export function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Today's date as YYYY-MM-DD. In the browser this is the device's local date; on the
 * server (UTC on Vercel) we use Malaysia time so a note saved at 7am MYT isn't dated yesterday.
 */
export function todayISO(timeZone?: string): string {
  const tz = timeZone ?? (typeof window === "undefined" ? "Asia/Kuala_Lumpur" : undefined);
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[ً-ٰٟ]/g, ""); // strip Arabic harakat for search
}
