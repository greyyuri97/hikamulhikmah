"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Rocket, Trash2, Upload } from "lucide-react";
import type { DarsVideo } from "@/lib/types";
import { deleteRecord, publishVideo } from "@/lib/actions";
import { parseTranscript } from "@/lib/transcriptParser";
import { VIDEO_CATEGORIES } from "@/lib/sections";
import { extractYoutubeId, ytThumb } from "@/lib/utils";

const EMPTY = { youtube_url: "", title_malay: "", title_arabic: "", type: "Satu Tajuk", series_name: "", episode: 1, category: "Fiqh" };
const SAMPLE = `[00:05]
بسم الله الرحمن الرحيم
Dengan nama Allah Yang Maha Pemurah lagi Maha Penyayang.
[01:25]
الحمد لله رب العالمين
Segala puji bagi Allah, Tuhan sekalian alam.`;

export default function DarsGenerator({ videos }: { videos: DarsVideo[] }) {
  const [f, setF] = useState(EMPTY);
  const [raw, setRaw] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const rows = useMemo(() => parseTranscript(raw), [raw]);
  const yt = extractYoutubeId(f.youtube_url);
  const seriesNames = Array.from(new Set(videos.map((v) => v.series_name).filter(Boolean)));
  const set = (k: keyof typeof EMPTY, v: string | number) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (!yt || f.title_malay) return;
    fetch(`/api/oembed?url=${yt}`).then((r) => r.json()).then((d) => d.title && setF((s) => (s.title_malay ? s : { ...s, title_malay: d.title })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yt]);

  const publish = async () => {
    setBusy(true); setMsg("");
    const r = await publishVideo({ ...f, episode: Number(f.episode) }, rows, editId ?? undefined);
    setBusy(false);
    if (r.ok) { setMsg(`✓ Diterbitkan (${rows.length} baris transkrip)`); setF(EMPTY); setRaw(""); setEditId(null); router.refresh(); }
    else setMsg(r.error);
  };

  return (
    <div className="space-y-6">
      <div className="card grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <h2 className="font-serif font-semibold">{editId ? "Kemas kini kuliah (transkrip akan diganti)" : "Penjana Dars Syeikhuna"}</h2>
          <input className="input" placeholder="URL YouTube" value={f.youtube_url} onChange={(e) => set("youtube_url", e.target.value)} />
          {yt && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ytThumb(yt)} alt="" className="aspect-video w-full rounded-xl object-cover" />
          )}
          <input className="input" placeholder="Tajuk (Melayu)" value={f.title_malay} onChange={(e) => set("title_malay", e.target.value)} />
          <input className="input font-arabic text-lg" dir="rtl" placeholder="العنوان (عربي)" value={f.title_arabic} onChange={(e) => set("title_arabic", e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <select className="input" value={f.type} onChange={(e) => set("type", e.target.value)}>
              <option>Satu Tajuk</option><option>Bersiri</option>
            </select>
            <input className="input" list="cats" placeholder="Kategori" value={f.category} onChange={(e) => set("category", e.target.value)} />
            <datalist id="cats">{VIDEO_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          {f.type === "Bersiri" && (
            <div className="grid grid-cols-[1fr_6rem] gap-2">
              <input className="input" list="series" placeholder="Nama Siri" value={f.series_name} onChange={(e) => set("series_name", e.target.value)} />
              <datalist id="series">{seriesNames.map((s) => <option key={s} value={s} />)}</datalist>
              <input className="input" type="number" min={1} placeholder="Ep." value={f.episode} onChange={(e) => set("episode", e.target.value)} />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Transkrip mentah (MM:SS / HH:MM:SS / .srt)</label>
            <label className="btn-ghost cursor-pointer border border-line">
              <Upload size={14} /> <span className="text-xs">.txt / .srt</span>
              <input type="file" accept=".txt,.srt,text/plain" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) setRaw(await file.text()); }} />
            </label>
          </div>
          <textarea className="input min-h-[320px] font-mono text-sm" value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={SAMPLE} />
          <p className="text-xs text-muted">Setiap cap masa memulakan baris baharu. Baris Arab & Melayu diasingkan secara automatik (atau guna “Arab | Melayu” dalam satu baris).</p>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line p-3">
            <h3 className="font-semibold">Pratonton — {rows.length} baris</h3>
            <span className="text-xs text-muted">{rows.filter((r) => !r.arabic_text || !r.malay_translation).length} baris tidak lengkap</span>
          </div>
          <div className="max-h-[400px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-paper text-left text-xs text-muted"><tr><th className="p-2">Masa</th><th className="p-2">Melayu</th><th className="p-2 text-right">عربي</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-line align-top">
                    <td className="p-2"><span className="badge-time">{r.time_display}</span></td>
                    <td className={`p-2 ${!r.malay_translation ? "bg-amber-500/10" : ""}`}>{r.malay_translation}</td>
                    <td dir="rtl" className={`p-2 font-arabic text-base ${!r.arabic_text ? "bg-amber-500/10" : ""}`}>{r.arabic_text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button className="btn-accent px-5 py-2.5" disabled={busy || !yt || !f.title_malay} onClick={publish}><Rocket size={16} /> {busy ? "Menerbitkan…" : "Generate & Publish"}</button>
        {editId && <button className="btn-ghost" onClick={() => { setEditId(null); setF(EMPTY); setRaw(""); }}>Batal edit</button>}
        {msg && <span className="text-sm text-accent">{msg}</span>}
      </div>

      <div className="space-y-2">
        <h3 className="font-serif font-semibold">Kuliah sedia ada ({videos.length})</h3>
        {videos.map((v) => (
          <div key={v.video_id} className="card flex items-center gap-3 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ytThumb(v.youtube_id)} alt="" className="h-14 w-24 rounded-md object-cover" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="line-clamp-1 font-medium">{v.title_malay}</p>
              <p className="text-xs text-muted">{v.type === "Bersiri" ? `${v.series_name} · Ep ${v.episode}` : "Satu Tajuk"} · {v.category}</p>
            </div>
            <button className="btn-ghost" aria-label="Edit" onClick={() => {
              setEditId(v.video_id);
              setF({ youtube_url: `https://youtu.be/${v.youtube_id}`, title_malay: v.title_malay, title_arabic: v.title_arabic, type: v.type, series_name: v.series_name, episode: v.episode || 1, category: v.category });
              setRaw("");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}><Pencil size={14} /></button>
            <button className="btn-ghost hover:!text-red-600" aria-label="Padam" onClick={async () => {
              if (!confirm("Padam kuliah ini beserta transkripnya?")) return;
              const r = await deleteRecord("videos", v.video_id);
              if (!r.ok) alert(r.error); else router.refresh();
            }}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
