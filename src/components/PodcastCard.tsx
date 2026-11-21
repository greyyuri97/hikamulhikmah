"use client";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Download, ExternalLink, FileText, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Podcast } from "@/lib/types";
import { parsePdfLink } from "@/lib/pdfLink";
import { formatDateMs, ytThumb } from "@/lib/utils";

export default function PodcastCard({ p }: { p: Podcast }) {
  const [viewer, setViewer] = useState(false);
  const pdf = parsePdfLink(p.pdf_url);
  const yt = `https://www.youtube.com/watch?v=${p.youtube_id}`;
  // Mobile browsers (Android Chrome, iOS Safari) can't render a raw .pdf inside an iframe,
  // so non-Drive PDFs open in a new tab on phones; Drive/Docs "/preview" works everywhere.
  const openViewer = () => {
    if (!pdf) return;
    const phone = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
    if (pdf.kind === "direct" && phone) window.open(pdf.view, "_blank", "noopener,noreferrer");
    else setViewer(true);
  };

  return (
    <article className="card group flex flex-col overflow-hidden transition hover:shadow-md">
      <a href={yt} target="_blank" rel="noopener noreferrer" className="relative block aspect-video bg-line" aria-label={`Tonton di YouTube: ${p.title}`}>
        <Image src={ytThumb(p.youtube_id)} alt={p.title} fill sizes="(max-width:640px) 100vw, 33vw" className="object-cover" />
        <span className="absolute inset-0 grid place-items-center bg-black/0 transition group-hover:bg-black/25">
          <ExternalLink className="text-white opacity-0 transition group-hover:opacity-100" />
        </span>
      </a>
      <div className="flex flex-1 flex-col p-3">
        <a href={yt} target="_blank" rel="noopener noreferrer" className="line-clamp-2 font-medium hover:text-accent">{p.title}</a>
        <p className="mt-1 text-xs text-muted">{formatDateMs(p.date_added)}</p>
        {pdf && (
          <div className="mt-auto grid grid-cols-1 gap-2 pt-3 min-[400px]:grid-cols-2 sm:grid-cols-1 lg:grid-cols-2">
            <button onClick={openViewer} className="btn-accent whitespace-nowrap text-[13px]">
              <FileText size={15} /> Baca Transkrip (PDF)
            </button>
            <a href={pdf.download} target="_blank" rel="noopener noreferrer" download className="btn whitespace-nowrap border border-accent/40 text-[13px] text-accent hover:bg-accent/10">
              <Download size={15} /> Muat Turun PDF
            </a>
          </div>
        )}
      </div>
      {pdf && <PdfViewer open={viewer} onClose={() => setViewer(false)} title={p.title} src={pdf.preview} newTab={pdf.view} download={pdf.download} />}
    </article>
  );
}

function PdfViewer({ open, onClose, title, src, newTab, download }: { open: boolean; onClose: () => void; title: string; src: string; newTab: string; download: string }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!open) { setLoaded(false); return; }
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // stop the page scrolling behind the modal
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = prev; };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] flex items-stretch justify-center bg-black/60 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            role="dialog" aria-modal="true" aria-label={`Transkrip: ${title}`}
            className="flex h-[100dvh] w-full max-w-4xl flex-col overflow-hidden bg-surface sm:h-[90vh] sm:rounded-2xl sm:border sm:border-line"
            initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-line p-2 pl-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
              <FileText size={18} className="shrink-0 text-accent" />
              <p className="min-w-0 flex-1 truncate font-serif text-sm font-semibold">{title}</p>
              <a href={download} target="_blank" rel="noopener noreferrer" download className="btn-ghost" aria-label="Muat Turun PDF" title="Muat Turun PDF"><Download size={17} /></a>
              <a href={newTab} target="_blank" rel="noopener noreferrer" className="btn-ghost" aria-label="Buka di tab baharu" title="Buka di tab baharu"><ExternalLink size={17} /></a>
              <button onClick={onClose} className="btn-ghost" aria-label="Tutup"><X size={18} /></button>
            </div>
            <div className="relative flex-1 bg-paper">
              {!loaded && <div className="absolute inset-0 grid place-items-center text-sm text-muted">Memuatkan transkrip…</div>}
              <iframe src={src} title={`Transkrip PDF: ${title}`} className="relative h-full w-full border-0" onLoad={() => setLoaded(true)} allow="autoplay" referrerPolicy="no-referrer" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
