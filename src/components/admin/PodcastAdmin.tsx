"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { Podcast } from "@/lib/types";
import { addPodcast, deleteRecord } from "@/lib/actions";
import { extractYoutubeId, ytThumb } from "@/lib/utils";

export default function PodcastAdmin({ podcasts }: { podcasts: Podcast[] }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const id = extractYoutubeId(url);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/oembed?url=${encodeURIComponent(url)}`).then((r) => r.json()).then((d) => { if (d.title) setTitle(d.title); }).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card h-fit space-y-3 p-4">
        <h2 className="font-serif font-semibold">Tambah Podcast</h2>
        <input className="input" placeholder="https://www.youtube.com/watch?v=…" value={url} onChange={(e) => setUrl(e.target.value)} />
        {id && (
          <div className="overflow-hidden rounded-xl border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ytThumb(id)} alt="" className="aspect-video w-full object-cover" />
          </div>
        )}
        <input className="input" placeholder={loading ? "Mengambil tajuk…" : "Tajuk"} value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="flex items-center gap-2">
          <button className="btn-accent" disabled={!id} onClick={async () => {
            const r = await addPodcast(url, title);
            if (r.ok) { setMsg("✓ Disimpan"); setUrl(""); setTitle(""); router.refresh(); } else setMsg(r.error);
          }}><Plus size={14} /> Simpan</button>
          {msg && <span className="text-sm text-accent">{msg}</span>}
        </div>
      </div>
      <div className="space-y-2">
        {podcasts.map((p) => (
          <div key={p.podcast_id} className="card flex items-center gap-3 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ytThumb(p.youtube_id)} alt="" className="h-14 w-24 rounded-md object-cover" />
            <p className="line-clamp-2 flex-1 text-sm">{p.title}</p>
            <button className="btn-ghost hover:!text-red-600" aria-label="Padam" onClick={async () => {
              if (!confirm("Padam podcast ini?")) return;
              const r = await deleteRecord("podcast", p.podcast_id);
              if (!r.ok) alert(r.error); else router.refresh();
            }}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
