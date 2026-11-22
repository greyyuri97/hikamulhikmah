/**
 * Image + source-post link helpers for notes (Bukhari / Muslim / Fawaid).
 *
 * Images: Google Drive sharing links are rewritten to Google's direct image host
 *   https://lh3.googleusercontent.com/d/FILE_ID  (works in <img>, unlike /file/d/…/view)
 * Accepted Drive forms: /file/d/ID/…, open?id=ID, uc?id=ID, thumbnail?id=ID, lh3…/d/ID.
 * Any other https image URL is kept as-is. Only https is accepted (http would be blocked as
 * mixed content on the live site); javascript:/data: etc. are rejected.
 */
const DRIVE_ID = /^[\w-]{20,}$/;

function asUrl(raw: string): URL | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
}

export interface ImageLink { kind: "drive" | "direct"; url: string; driveId?: string }

export function parseImageLink(input: string | null | undefined): ImageLink | null {
  const u = asUrl(String(input ?? ""));
  if (!u || u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase();
  if (host === "drive.google.com" || host === "docs.google.com") {
    const id = u.pathname.match(/\/(?:file\/)?d\/([\w-]+)/)?.[1] ?? u.searchParams.get("id") ?? "";
    return DRIVE_ID.test(id) ? { kind: "drive", driveId: id, url: `https://lh3.googleusercontent.com/d/${id}` } : null;
  }
  if (host === "lh3.googleusercontent.com") {
    const id = u.pathname.match(/^\/d\/([\w-]+)/)?.[1];
    if (id && DRIVE_ID.test(id)) return { kind: "drive", driveId: id, url: `https://lh3.googleusercontent.com/d/${id}` };
  }
  return { kind: "direct", url: u.toString() };
}

/** Original post link: any http(s) URL (Facebook, Telegram, Instagram, blog…). */
export function parseSourceLink(input: string | null | undefined): string | null {
  const u = asUrl(String(input ?? ""));
  if (!u || (u.protocol !== "https:" && u.protocol !== "http:") || !u.hostname.includes(".")) return null;
  return u.toString();
}

/** Short, friendly label for a source link: "Facebook", "Telegram", or the bare domain. */
export function sourceLabel(url: string): string {
  try {
    const h = new URL(url).hostname.replace(/^(www|m|web|mobile)\./, "");
    if (/(^|\.)facebook\.com$|(^|\.)fb\.(com|watch)$/.test(h)) return "Facebook";
    if (/(^|\.)t\.me$|(^|\.)telegram\.(me|org)$/.test(h)) return "Telegram";
    if (/(^|\.)instagram\.com$/.test(h)) return "Instagram";
    if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(h)) return "YouTube";
    if (/(^|\.)(x|twitter)\.com$/.test(h)) return "X";
    if (/(^|\.)whatsapp\.com$|(^|\.)wa\.me$/.test(h)) return "WhatsApp";
    return h;
  } catch {
    return "Pautan";
  }
}
