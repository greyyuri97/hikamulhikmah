// "Sambung Pengajian" — last viewed lecture/note, stored per device.
export interface LastViewed {
  kind: "video" | "note";
  section: string;
  title: string;
  snippet?: string;
  href: string;
  at: number;
  time_display?: string;
}
const KEY = "hk-last-viewed";
export function saveLastViewed(v: Omit<LastViewed, "at">) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...v, at: Date.now() })); localStorage.removeItem(KEY + "-dismissed"); } catch {}
}
export function readLastViewed(): LastViewed | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null") as LastViewed | null;
    if (!v || localStorage.getItem(KEY + "-dismissed") === String(v.at)) return null;
    return v;
  } catch { return null; }
}
export function dismissLastViewed(at: number) {
  try { localStorage.setItem(KEY + "-dismissed", String(at)); } catch {}
}
