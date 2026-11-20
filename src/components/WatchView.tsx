"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileDown, Search } from "lucide-react";
import type { DarsVideo, TranscriptRow } from "@/lib/types";
import { normalize } from "@/lib/utils";
import CopyButton from "./CopyButton";
import BookmarkButton from "./BookmarkButton";
import { Highlighted } from "./NoteCard";
import { QuoteCardButton } from "./QuoteCard";
import { saveLastViewed } from "@/lib/progress";
import { formatTime } from "@/lib/utils";

type Mode = "both" | "ar" | "ms";
const MODES: { m: Mode; label: string }[] = [
  { m: "both", label: "Dwi-Bahasa" },
  { m: "ar", label: "Arab Sahaja" },
  { m: "ms", label: "Melayu Sahaja" },
];

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void }
}

function loadYT(): Promise<any> {
  return new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
    if (!document.getElementById("yt-api")) {
      const s = document.createElement("script");
      s.id = "yt-api";
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  });
}

export default function WatchView({ video, rows, startAt }: { video: DarsVideo; rows: TranscriptRow[]; startAt: number }) {
  const [mode, setMode] = useState<Mode>("both");
  const [q, setQ] = useState("");
  const [current, setCurrent] = useState(-1);
  const player = useRef<any>(null);
  const holder = useRef<HTMLDivElement>(null);

  const track = useCallback((t: number) => saveLastViewed({ kind: "video", section: "Dars Syeikhuna", title: video.title_malay, snippet: video.title_arabic, href: `/dars-syeikhuna/watch/${video.video_id}${t ? `?t=${t}` : ""}`, time_display: t ? formatTime(t) : undefined }), [video]);
  useEffect(() => { track(startAt); }, [track, startAt]);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval>;
    loadYT().then((YT) => {
      if (!alive || !holder.current) return;
      player.current = new YT.Player(holder.current, {
        videoId: video.youtube_id,
        playerVars: { start: startAt || undefined, rel: 0, modestbranding: 1, playsinline: 1, autoplay: startAt ? 1 : 0 },
      });
      timer = setInterval(() => {
        const t = player.current?.getCurrentTime?.();
        if (typeof t !== "number") return;
        let idx = -1;
        for (let i = 0; i < rows.length; i++) if (rows[i].time_seconds <= t + 0.5) idx = i; else break;
        setCurrent(idx);
        if (t > 5 && Math.floor(t) % 10 === 0) track(Math.floor(t));
      }, 800);
    });
    return () => { alive = false; clearInterval(timer); player.current?.destroy?.(); };
  }, [video.youtube_id, startAt, rows, track]);

  useEffect(() => {
    if (!startAt) return;
    const i = rows.findIndex((r) => r.time_seconds >= startAt);
    if (i >= 0) setTimeout(() => document.getElementById(`row-${i}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 600);
  }, [startAt, rows]);

  const seek = useCallback((s: number) => {
    const p = player.current;
    if (p?.seekTo) { p.seekTo(s, true); p.playVideo?.(); }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const nq = normalize(q.trim());
  const shown = useMemo(
    () => rows.map((r, i) => ({ r, i })).filter(({ r }) => !nq || normalize(r.arabic_text + " " + r.malay_translation).includes(nq)),
    [rows, nq],
  );

  const fmtRow = (r: TranscriptRow) =>
    [`[${r.time_display}]`, mode !== "ms" && r.arabic_text, mode !== "ar" && r.malay_translation].filter(Boolean).join("\n");
  const allText = () =>
    `*${video.title_malay}*${video.title_arabic ? `\n${video.title_arabic}` : ""}\nhttps://youtu.be/${video.youtube_id}\n\n` +
    rows.map(fmtRow).join("\n\n");

  return (
    <div className="-mx-4 sm:mx-0">
      <div className="print-static sticky top-16 z-30 bg-paper pb-2 sm:pt-0">
        <div className="no-print mx-auto max-w-4xl overflow-hidden bg-black sm:rounded-2xl">
          <div className="relative aspect-video"><div ref={holder} className="absolute inset-0 h-full w-full [&>iframe]:h-full [&>iframe]:w-full" /></div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-0">
        <Link href="/dars-syeikhuna" className="no-print mb-2 mt-2 inline-flex items-center gap-1 text-sm text-muted hover:text-accent"><ArrowLeft size={14} /> Semua kuliah</Link>
        <header className="mb-4">
          {video.title_arabic && <h2 dir="rtl" className="font-arabic text-2xl leading-relaxed text-accent">{video.title_arabic}</h2>}
          <h1 className="font-serif text-xl font-semibold sm:text-2xl">{video.title_malay}</h1>
          <p className="mt-1 text-xs text-muted">
            {[video.category, video.type === "Bersiri" ? `${video.series_name} · Episod ${video.episode}` : "Satu Tajuk"].filter(Boolean).join(" · ")}
            <span className="print-only">https://youtu.be/{video.youtube_id}</span>
          </p>
        </header>

        <div className="no-print card mb-4 space-y-3 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-line p-0.5">
              {MODES.map(({ m, label }) => (
                <button key={m} onClick={() => setMode(m)} className={`rounded-md px-2.5 py-1 text-xs sm:text-sm ${mode === m ? "bg-accent text-white" : "text-muted"}`}>{label}</button>
              ))}
            </div>
            <div className="ml-auto flex">
              <CopyButton text={allText} label="Salin Semua Teks" />
              <button className="btn-ghost" onClick={() => window.print()}><FileDown size={16} /><span className="text-xs">Muat Turun Nota (PDF)</span></button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input className="input pl-9" placeholder="Cari dalam kuliah ini…" value={q} onChange={(e) => setQ(e.target.value)} />
            {nq && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{shown.length} padanan</span>}
          </div>
        </div>

        <div className="space-y-3">
          {shown.map(({ r, i }) => {
            const active = i === current;
            const badge = (
              <button onClick={() => seek(r.time_seconds)} className={`badge-time cursor-pointer hover:bg-accent hover:text-white ${active ? "!bg-accent !text-white" : ""}`} title="Lompat ke masa ini">
                [{r.time_display}]
              </button>
            );
            const ar = mode !== "ms" && r.arabic_text ? <p className="arabic text-ink"><Highlighted text={r.arabic_text} q={q} /></p> : null;
            const ms = mode !== "ar" && r.malay_translation ? <p className="leading-7 text-ink"><Highlighted text={r.malay_translation} q={q} /></p> : null;
            const tools = (
              <div className="no-print flex justify-end">
                <BookmarkButton compact item={{ id: `tr:${video.video_id}:${r.time_seconds}`, kind: "transcript", section: "Dars Syeikhuna", title: `${video.title_malay} [${r.time_display}]`, snippet: r.malay_translation || r.arabic_text, href: `/dars-syeikhuna/watch/${video.video_id}?t=${r.time_seconds}` }} />
                <QuoteCardButton data={{ arabic: mode !== "ms" ? r.arabic_text : undefined, text: mode !== "ar" ? r.malay_translation : undefined, source: `${video.title_malay} — [${r.time_display}]` }} />
                <CopyButton text={() => `*${video.title_malay}* [${r.time_display}]\n\n${[r.arabic_text, r.malay_translation].filter(Boolean).join("\n\n")}\n\nhttps://youtu.be/${video.youtube_id}?t=${r.time_seconds}`} />
              </div>
            );
            return (
              <article id={`row-${i}`} key={i} className={`print-row card scroll-mt-[50vh] p-3 transition-colors sm:p-4 ${active ? "border-accent/60 ring-1 ring-accent/30" : ""}`}>
                {/* Mobile: stacked */}
                <div className="space-y-2 md:hidden">
                  <div className="flex items-center justify-between">{badge}{tools}</div>
                  {ar}
                  {ms}
                </div>
                {/* Desktop: 2-column */}
                <div className={`hidden gap-6 md:grid ${mode === "both" ? "grid-cols-2" : "grid-cols-1"}`}>
                  {mode !== "ar" && <div className="space-y-2"><div className="flex items-center gap-2">{badge}</div>{ms}</div>}
                  {mode !== "ms" && <div className="space-y-2">{mode === "ar" && <div>{badge}</div>}{ar}</div>}
                  <div className={mode === "both" ? "col-span-2 -mt-3" : ""}>{tools}</div>
                </div>
              </article>
            );
          })}
          {rows.length === 0 && <p className="card p-10 text-center text-muted">Transkrip belum tersedia.</p>}
        </div>
      </div>
    </div>
  );
}
