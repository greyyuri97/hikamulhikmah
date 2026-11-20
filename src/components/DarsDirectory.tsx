"use client";
import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { ChevronDown, Layers, Search } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { DarsVideo, TranscriptRow } from "@/lib/types";
import { normalize, ytThumb } from "@/lib/utils";
import BookmarkButton from "./BookmarkButton";

const TYPES = ["Semua", "Bersiri", "Satu Tajuk"] as const;

function VideoCard({ v }: { v: DarsVideo }) {
  return (
    <div className="card overflow-hidden">
      <Link href={`/dars-syeikhuna/watch/${v.video_id}`} className="block">
        <div className="relative aspect-video bg-line">
          <Image src={ytThumb(v.youtube_id)} alt={v.title_malay} fill sizes="(max-width:640px) 100vw, 33vw" className="object-cover" />
          {v.type === "Bersiri" && <span className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-xs text-white">Ep. {v.episode}</span>}
        </div>
      </Link>
      <div className="flex items-start gap-2 p-3">
        <Link href={`/dars-syeikhuna/watch/${v.video_id}`} className="min-w-0 flex-1">
          {v.title_arabic && <p dir="rtl" className="font-arabic text-lg leading-snug text-accent">{v.title_arabic}</p>}
          <p className="line-clamp-2 font-medium">{v.title_malay}</p>
          {v.category && <span className="mt-1 inline-block rounded bg-paper px-1.5 text-xs text-muted">{v.category}</span>}
        </Link>
        <BookmarkButton compact item={{ id: `video:${v.video_id}`, kind: "video", section: "Dars Syeikhuna", title: v.title_malay, snippet: v.title_arabic, href: `/dars-syeikhuna/watch/${v.video_id}` }} />
      </div>
    </div>
  );
}

export default function DarsDirectory({ videos, transcripts }: { videos: DarsVideo[]; transcripts: TranscriptRow[] }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("Semua");
  const [cat, setCat] = useState("Semua");
  const [openSeries, setOpenSeries] = useState<Record<string, boolean>>({});

  const categories = useMemo(() => ["Semua", ...Array.from(new Set(videos.map((v) => v.category).filter(Boolean)))], [videos]);
  const nq = normalize(q.trim());

  const hits = useMemo(() => {
    if (nq.length < 2) return [];
    const vm = new Map(videos.map((v) => [v.video_id, v]));
    return transcripts
      .filter((t) => normalize(t.arabic_text + " " + t.malay_translation).includes(nq) && vm.has(t.video_id))
      .slice(0, 30)
      .map((t) => ({ ...t, video: vm.get(t.video_id)! }));
  }, [nq, transcripts, videos]);

  const filtered = videos.filter(
    (v) =>
      (type === "Semua" || v.type === type) &&
      (cat === "Semua" || v.category === cat) &&
      (!nq || normalize(`${v.title_malay} ${v.title_arabic} ${v.series_name}`).includes(nq) || hits.some((h) => h.video_id === v.video_id)),
  );
  const series = new Map<string, DarsVideo[]>();
  const singles: DarsVideo[] = [];
  for (const v of filtered) {
    if (v.type === "Bersiri" && v.series_name) series.set(v.series_name, [...(series.get(v.series_name) ?? []), v]);
    else singles.push(v);
  }
  series.forEach((l) => l.sort((a, b) => a.episode - b.episode));

  return (
    <div>
      <header className="mb-5">
        <p dir="rtl" className="font-arabic text-2xl text-accent">دروس شيخنا</p>
        <h1 className="font-serif text-2xl font-semibold sm:text-3xl">Dars Syeikhuna (YouTube)</h1>
        <p className="mt-1 text-sm text-muted">{videos.length} kuliah · transkrip Arab–Melayu boleh dicari</p>
      </header>

      <div className="mb-5 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input className="input pl-9" placeholder="Cari tajuk atau isi transkrip…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button key={t} onClick={() => setType(t)} className={`tap rounded-full border px-3 py-1.5 text-sm ${type === t ? "border-accent bg-accent text-white" : "border-line bg-surface text-muted"}`}>{t}</button>
          ))}
          <select className="input w-auto py-1 text-sm" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Kategori">
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {hits.length > 0 && (
        <section className="card mb-6 p-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-accent">Padanan dalam transkrip ({hits.length})</h2>
          <ul className="divide-y divide-line">
            {hits.map((h, i) => (
              <li key={i} className="flex items-start gap-3 py-2">
                <Link href={`/dars-syeikhuna/watch/${h.video_id}?t=${h.time_seconds}`} className="badge-time tap mt-0.5 hover:bg-accent hover:text-white">[{h.time_display}]</Link>
                <div className="min-w-0 text-sm">
                  <p className="font-medium">{h.video.title_malay}</p>
                  {h.arabic_text && <p dir="rtl" className="font-arabic line-clamp-1">{h.arabic_text}</p>}
                  <p className="line-clamp-2 text-muted">{h.malay_translation}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="space-y-4">
        {[...series.entries()].map(([name, list]) => {
          const open = openSeries[name] ?? true;
          return (
            <section key={name} className="card overflow-hidden">
              <button onClick={() => setOpenSeries((s) => ({ ...s, [name]: !open }))} className="flex w-full items-center justify-between gap-3 p-4 text-left">
                <span className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent"><Layers size={18} /></span>
                  <span><span className="block font-serif font-semibold">{name}</span><span className="text-xs text-muted">{list.length} episod · Bersiri</span></span>
                </span>
                <ChevronDown className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="grid gap-3 border-t border-line p-4 sm:grid-cols-2 lg:grid-cols-3">
                      {list.map((v) => <VideoCard key={v.video_id} v={v} />)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          );
        })}
        {singles.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{singles.map((v) => <VideoCard key={v.video_id} v={v} />)}</div>
        )}
        {filtered.length === 0 && <p className="card p-10 text-center text-muted">Tiada kuliah ditemui.</p>}
      </div>
    </div>
  );
}
