# حِكَمُ الحِكْمَةِ — Intisari Kebijaksanaan

Portal Ilmu & Talaqqi (PWA) — Next.js 15 · TypeScript · Tailwind · Framer Motion · Google Sheets.

Public pages need no login. Only `/admin` is protected (password → HTTP-only signed cookie).

| Route | Content (Sheet tab) |
|---|---|
| `/` | Global search, section cards, "Terkini" feed |
| `/dars-bukhari` | `Bukhari_Notes` |
| `/dars-muslim` | `Muslim_Notes` |
| `/fawaid-zahabiyyah` | `Fawaid_Zahabiyyah` |
| `/dars-syeikhuna` (+ `/watch/[video_id]?t=`) | `Dars_Videos`, `Dars_Transcripts` |
| `/podcast-hikmah` | `Podcast_Hikmah` |
| `/admin` | Add / edit / delete for all 5 sections |

## Setup
1. `npm install`
2. Copy `.env.example` → `.env.local` and fill in:
   - `GOOGLE_SHEETS_CLIENT_EMAIL` = `client_email` from `google-key.json`
   - `GOOGLE_SHEETS_PRIVATE_KEY` = `private_key` from `google-key.json` (keep the `\n`s, wrap in quotes)
   - `GOOGLE_SHEET_ID` = the long id in the sheet URL `/spreadsheets/d/<ID>/edit`
   - `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`
3. **Share the Google Sheet with the service-account email as _Editor_.**
4. `npm run setup-sheets` — creates the 6 tabs with headers (or click "Sediakan Tab Sheets" in `/admin`).
5. Put your logo at `public/logo.png` (falls back to typographic calligraphy if missing).
6. `npm run dev` → http://localhost:3000

## Transcript format (Admin → Dars Syeikhuna)
```
[00:05]
بسم الله الرحمن الرحيم
Dengan nama Allah Yang Maha Pemurah lagi Maha Penyayang.
01:25 الحمد لله | Segala puji bagi Allah
```
`MM:SS`, `HH:MM:SS` and `.srt` files are supported. Arabic vs Malay lines are detected by script.

## Caching
Reads use `unstable_cache` with tags (`bukhari`, `muslim`, `fawaid`, `dars-videos`, `dars-transcripts`, `podcast`), revalidated every 10 min and immediately via `revalidateTag` on any admin write.

## Deploy (Vercel)
Push to GitHub → import in Vercel → add the same env vars (paste the private key as-is) → Deploy.
