export function extractYoutubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m =
    s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([\w-]{11})/) || null;
  return m ? m[1] : null;
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

/** Parse a date string in many formats (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY) into a sortable timestamp. */
export function dateValue(d: string): number {
  if (!d) return 0;
  const dmy = d.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (dmy) return new Date(+dmy[3], +dmy[2] - 1, +dmy[1]).getTime();
  const t = Date.parse(d);
  return isNaN(t) ? 0 : t;
}

export function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[ً-ٰٟ]/g, ""); // strip Arabic harakat for search
}
