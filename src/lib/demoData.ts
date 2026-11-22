// Sample rows used only when DEMO_DATA=1 and Google Sheets is not configured (local preview / screenshots).
import type { SheetKey } from "./sections";
const r = (rows: Record<string, string>[]) => rows.map((x, i) => ({ ...x, _row: String(i + 2) }));
export const DEMO: Record<SheetKey, (Record<string, string> & { _row: string })[]> = {
  bukhari: r([
    { note_id: "b1", date: "2026-11-14", image_url: "https://lh3.googleusercontent.com/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345", source_url: "https://www.facebook.com/darulhikmah/posts/123", content: "Bab Bagaimana Permulaan Wahyu.\n\nإِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ\n\nSesungguhnya setiap amalan itu bergantung kepada niat. Imam al-Bukhari memulakan Sahihnya dengan hadis ini sebagai peringatan kepada penuntut ilmu agar memperbetulkan niat sebelum memulakan pengajian.\n\nFaedah: Niat adalah syarat sah ibadah dan ukuran pahala sesuatu amalan." },
    { note_id: "b2", date: "2026-11-07", content: "Kitab al-Iman — Bab Islam dibina atas lima perkara.\n\nPenjelasan Syeikh tentang rukun Islam dan hubungannya dengan iman." },
    { note_id: "b3", date: "2026-10-24", content: "Kitab al-Ilm — Bab kelebihan ilmu. Ilmu sebelum kata-kata dan amalan." },
    // --- edge cases exercised by the audit ---
    { note_id: "", date: "05/09/2026", content: "Nota ditaip terus dalam Sheet (tiada ID, tarikh format lama DD/MM/YYYY)." },
    { note_id: "b5", date: "", content: "Nota tanpa tarikh. https://example.com/" + "x".repeat(300) },
    { note_id: "b6", date: "2026-11-01", content: "" },
    { note_id: "b7", date: "bukan-tarikh", content: "=HYPERLINK(\"http://evil\") — teks bermula dengan = disimpan sebagai teks biasa." },
  ]),
  muslim: r([{ note_id: "m1", date: "2026-11-10", content: "Muqaddimah Sahih Muslim — kepentingan sanad.\n\nالإِسْنَادُ مِنَ الدِّينِ" }]),
  fawaid: r([{ note_id: "f1", date: "2026-11-18", content: "Tafaqquh: ilmu itu didatangi, bukan ia yang datang kepadamu." }]),
  videos: r([
    { video_id: "v1", youtube_id: "aqz-KE-bpKQ", title_malay: "Syarah Hadis Niat", title_arabic: "شرح حديث النية", type: "Bersiri", series_name: "Syarah Arbain Nawawi", episode: "1", category: "Hadis" },
    { video_id: "v2", youtube_id: "aqz-KE-bpKQ", title_malay: "Adab Penuntut Ilmu", title_arabic: "آداب طالب العلم", type: "Satu Tajuk", series_name: "", episode: "", category: "Akidah" },
  ]),
  transcripts: r([
    { video_id: "v1", time_seconds: "", time_display: "", arabic_text: "", malay_translation: "" },
    { video_id: "v1", time_seconds: "abc", time_display: "", arabic_text: "", malay_translation: "Baris tanpa masa → 00:00" },
    { video_id: "v1", time_seconds: "5", time_display: "00:05", arabic_text: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ", malay_translation: "Dengan nama Allah Yang Maha Pemurah lagi Maha Penyayang." },
    { video_id: "v1", time_seconds: "85", time_display: "01:25", arabic_text: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى", malay_translation: "Sesungguhnya setiap amalan itu dengan niat, dan bagi setiap orang apa yang dia niatkan." },
  ]),
  podcast: r([
    { podcast_id: "p_bad", youtube_url: "https://www.youtube.com/playlist?list=PL123", youtube_id: "", title: "Baris rosak (playlist sahaja)", date_added: "" },{ podcast_id: "p1", youtube_url: "https://youtu.be/aqz-KE-bpKQ", youtube_id: "aqz-KE-bpKQ", title: "Podcast Hikmah #1 — Hikmah di sebalik ujian", date_added: "2026-11-19", pdf_url: "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view" },
    { podcast_id: "p2", youtube_url: "https://youtu.be/aqz-KE-bpKQ", youtube_id: "aqz-KE-bpKQ", title: "Podcast Hikmah #2 — Tanpa PDF", date_added: "2026-11-12", pdf_url: "" }]),
};
