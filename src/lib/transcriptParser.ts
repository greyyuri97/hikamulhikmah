import { formatTime, isArabic, toSeconds } from "./utils";

export interface ParsedRow {
  time_seconds: number;
  time_display: string;
  arabic_text: string;
  malay_translation: string;
}

const TS_LINE = /^\[?\(?((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?)\)?\]?\s*(?:-->\s*\S+)?\s*(.*)$/;

/**
 * Parses raw bilingual transcript text or SRT.
 * Each timestamp starts a new block; following lines are split into Arabic vs Malay by script detection.
 * Supports: "[01:25] text", "01:25 text", "1:02:03", SRT "00:01:25,000 --> 00:01:30,000".
 */
export function parseTranscript(raw: string): ParsedRow[] {
  const lines = raw.replace(/\r/g, "").split("\n");
  const rows: ParsedRow[] = [];
  let cur: { t: number; ar: string[]; ms: string[] } | null = null;

  const push = () => {
    if (cur && (cur.ar.length || cur.ms.length)) {
      rows.push({
        time_seconds: cur.t,
        time_display: formatTime(cur.t),
        arabic_text: cur.ar.join(" ").trim(),
        malay_translation: cur.ms.join(" ").trim(),
      });
    }
  };

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    if (/^\d+$/.test(line)) continue; // SRT index numbers
    const m = line.match(TS_LINE);
    const secs = m ? toSeconds(m[1]) : null;
    if (m && secs !== null) {
      push();
      cur = { t: secs, ar: [], ms: [] };
      line = m[2].trim();
      if (!line) continue;
    }
    if (!cur) cur = { t: 0, ar: [], ms: [] };
    // A line may hold "Arabic | Malay"
    const parts = line.split(/\s+\|\s+/);
    for (const p of parts) (isArabic(p) ? cur.ar : cur.ms).push(p);
  }
  push();
  return rows;
}
