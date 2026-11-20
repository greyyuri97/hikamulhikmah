// Creates the 6 required tabs (with header rows) in the Google Sheet defined in .env.local
// Usage: npm run setup-sheets
import { config } from "dotenv";
import { google } from "googleapis";
config({ path: ".env.local" });

const SHEETS = {
  Bukhari_Notes: ["note_id", "date", "content"],
  Muslim_Notes: ["note_id", "date", "content"],
  Fawaid_Zahabiyyah: ["note_id", "date", "content"],
  Dars_Videos: ["video_id", "youtube_id", "title_malay", "title_arabic", "type", "series_name", "episode", "category"],
  Dars_Transcripts: ["video_id", "time_seconds", "time_display", "arabic_text", "malay_translation"],
  Podcast_Hikmah: ["podcast_id", "youtube_url", "youtube_id", "title", "date_added"],
};

const { GOOGLE_SHEETS_CLIENT_EMAIL: email, GOOGLE_SHEETS_PRIVATE_KEY: key, GOOGLE_SHEET_ID: id } = process.env;
if (!email || !key || !id) { console.error("✗ Missing GOOGLE_SHEETS_* env vars in .env.local"); process.exit(1); }

const auth = new google.auth.JWT({ email, key: key.replace(/\\n/g, "\n"), scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
const sheets = google.sheets({ version: "v4", auth });

const meta = await sheets.spreadsheets.get({ spreadsheetId: id, fields: "properties.title,sheets.properties" });
const existing = new Set(meta.data.sheets.map((s) => s.properties.title));
const missing = Object.keys(SHEETS).filter((n) => !existing.has(n));
if (missing.length) {
  await sheets.spreadsheets.batchUpdate({ spreadsheetId: id, requestBody: { requests: missing.map((title) => ({ addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } } })) } });
}
await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: id,
  requestBody: { valueInputOption: "RAW", data: Object.entries(SHEETS).map(([n, h]) => ({ range: `${n}!A1`, values: [h] })) },
});
console.log(`✓ "${meta.data.properties.title}": created [${missing.join(", ") || "none"}]; headers written to all 6 tabs.`);
