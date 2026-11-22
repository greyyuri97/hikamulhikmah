"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, ImageOff, X, ZoomIn } from "lucide-react";
import { useEffect, useState } from "react";

/** Rounded, lazy-loaded image in a note card; tap/click opens a full-screen lightbox. */
export default function NoteImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = prev; };
  }, [open]);

  if (failed) {
    // Usually a Drive file that isn't shared as "Anyone with the link" — don't show a broken image.
    return (
      <a href={src} target="_blank" rel="noopener noreferrer" className="no-print mb-3 flex items-center gap-2 rounded-xl border border-dashed border-line p-3 text-xs text-muted hover:text-accent">
        <ImageOff size={16} /> Gambar tidak dapat dipaparkan — buka pautan
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative mb-3 block w-full overflow-hidden rounded-xl border border-line bg-paper"
        aria-label="Lihat gambar penuh"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="max-h-72 w-full object-contain transition-transform duration-300 group-hover:scale-[1.01] sm:max-h-80"
        />
        <span className="no-print absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white opacity-80 transition group-hover:opacity-100">
          <ZoomIn size={16} />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-3 sm:p-8"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            role="dialog" aria-modal="true" aria-label={alt}
          >
            <div className="absolute right-3 top-3 flex gap-2 pt-[env(safe-area-inset-top)]">
              <a href={src} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Buka gambar di tab baharu"><ExternalLink size={18} /></a>
              <button onClick={() => setOpen(false)} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Tutup"><X size={20} /></button>
            </div>
            <motion.img
              src={src}
              alt={alt}
              referrerPolicy="no-referrer"
              initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
