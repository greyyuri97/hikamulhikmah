export type NoteSectionKey = "bukhari" | "muslim" | "fawaid";

export const NOTE_SECTIONS: Record<
  NoteSectionKey,
  { key: NoteSectionKey; sheet: string; title: string; arabic: string; href: string; tag: string; blurb: string }
> = {
  bukhari: {
    key: "bukhari",
    sheet: "Bukhari_Notes",
    title: "Dars Soheh al-Bukhari",
    arabic: "صحيح البخاري",
    href: "/dars-bukhari",
    tag: "bukhari",
    blurb: "Nota pengajian Sahih al-Bukhari",
  },
  muslim: {
    key: "muslim",
    sheet: "Muslim_Notes",
    title: "Dars Soheh Muslim",
    arabic: "صحيح مسلم",
    href: "/dars-muslim",
    tag: "muslim",
    blurb: "Nota pengajian Sahih Muslim",
  },
  fawaid: {
    key: "fawaid",
    sheet: "Fawaid_Zahabiyyah",
    title: "Fawaid Zahabiyyah (Tafaqquh)",
    arabic: "فوائد ذهبية",
    href: "/fawaid-zahabiyyah",
    tag: "fawaid",
    blurb: "Mutiara faedah & tafaqquh",
  },
};

export const SHEETS = {
  bukhari: { name: "Bukhari_Notes", headers: ["note_id", "date", "content"] },
  muslim: { name: "Muslim_Notes", headers: ["note_id", "date", "content"] },
  fawaid: { name: "Fawaid_Zahabiyyah", headers: ["note_id", "date", "content"] },
  videos: {
    name: "Dars_Videos",
    headers: ["video_id", "youtube_id", "title_malay", "title_arabic", "type", "series_name", "episode", "category"],
  },
  transcripts: {
    name: "Dars_Transcripts",
    headers: ["video_id", "time_seconds", "time_display", "arabic_text", "malay_translation"],
  },
  podcast: { name: "Podcast_Hikmah", headers: ["podcast_id", "youtube_url", "youtube_id", "title", "date_added", "pdf_url"] },
} as const;

export type SheetKey = keyof typeof SHEETS;

export const SHEET_TAGS: Record<SheetKey, string> = {
  bukhari: "bukhari",
  muslim: "muslim",
  fawaid: "fawaid",
  videos: "dars-videos",
  transcripts: "dars-transcripts",
  podcast: "podcast",
};

export const VIDEO_CATEGORIES = ["Fiqh", "Akidah", "Tafsir", "Hadis", "Tasawuf", "Sirah", "Bahasa Arab", "Umum"];
