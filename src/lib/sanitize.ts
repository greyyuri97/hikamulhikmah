/**
 * Input hygiene for anything written to Google Sheets.
 *
 * Formula injection: all writes use valueInputOption "RAW", so Sheets stores text such as
 * "=HYPERLINK(...)" literally and never evaluates it. We deliberately do NOT prefix "'" or strip
 * leading = + - @, because notes legitimately start with "- point" bullets or "@" mentions and the
 * prefix would then appear on the public site. The remaining risk is someone exporting the sheet
 * to CSV and opening it in Excel; neutraliseForCsv() below is provided for any future export.
 */
export function cleanText(v: unknown, max = 10_000): string {
  return String(v ?? "")
    .replace(/\r\n?/g, "\n")
    // strip control chars except tab/newline (they can break Sheets cells and JSON)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

/** IDs we generate look like  bxx_lq3k9z1a2b  — reject anything else before it reaches a lookup. */
export function isSafeId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(id);
}

export function neutraliseForCsv(v: string) {
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}
