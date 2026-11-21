/**
 * Turn whatever the admin pastes into usable PDF links.
 *
 * Google Drive (any of):
 *   https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 *   https://drive.google.com/open?id=FILE_ID
 *   https://drive.google.com/uc?export=download&id=FILE_ID
 *   https://docs.google.com/document/d/FILE_ID/edit   (exported as PDF)
 * Direct: any https://…/something.pdf (query/fragment allowed), or other https URL.
 */
export type PdfLink =
  | { kind: "drive"; id: string; canonical: string; preview: string; view: string; download: string }
  | { kind: "docs"; id: string; canonical: string; preview: string; view: string; download: string }
  | { kind: "direct"; canonical: string; preview: string; view: string; download: string; isPdf: boolean };

const DRIVE_ID = /^[\w-]{20,}$/;

export function parsePdfLink(input: string | null | undefined): PdfLink | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  // Only http(s) — never javascript:, data:, file: etc.
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.toLowerCase();

  if (host === "drive.google.com") {
    const id = u.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] ?? u.searchParams.get("id") ?? "";
    if (!DRIVE_ID.test(id)) return null;
    return {
      kind: "drive",
      id,
      canonical: `https://drive.google.com/file/d/${id}/view`,
      preview: `https://drive.google.com/file/d/${id}/preview`,
      view: `https://drive.google.com/file/d/${id}/view`,
      download: `https://drive.google.com/uc?export=download&id=${id}`,
    };
  }

  if (host === "docs.google.com") {
    const m = u.pathname.match(/^\/(document|presentation|spreadsheets)\/d\/([\w-]+)/);
    if (!m || !DRIVE_ID.test(m[2])) return null;
    const [, type, id] = m;
    const base = `https://docs.google.com/${type}/d/${id}`;
    return {
      kind: "docs",
      id,
      canonical: `${base}/edit`,
      preview: `${base}/preview`,
      view: `${base}/preview`,
      download: `${base}/export?format=pdf`,
    };
  }

  if (u.protocol !== "https:") return null; // mixed content would be blocked in the viewer
  const canonical = u.toString();
  return { kind: "direct", canonical, preview: canonical, view: canonical, download: canonical, isPdf: /\.pdf$/i.test(u.pathname) };
}
