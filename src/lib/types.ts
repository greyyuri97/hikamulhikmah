export interface Note {
  note_id: string;
  date: string;
  content: string;
  /** Optional direct image URL (Drive links are stored already converted to lh3…/d/ID); "" when none. */
  image_url?: string;
  /** Optional link to the original Facebook / Telegram / web post; "" when none. */
  source_url?: string;
}
export interface DarsVideo {
  video_id: string;
  youtube_id: string;
  title_malay: string;
  title_arabic: string;
  type: "Bersiri" | "Satu Tajuk" | string;
  series_name: string;
  episode: number;
  category: string;
}
export interface TranscriptRow {
  video_id: string;
  time_seconds: number;
  time_display: string;
  arabic_text: string;
  malay_translation: string;
}
export interface Podcast {
  podcast_id: string;
  youtube_url: string;
  youtube_id: string;
  title: string;
  date_added: string;
  /** Optional — canonical PDF link (Drive /view URL or direct https URL); "" when none. */
  pdf_url: string;
}
