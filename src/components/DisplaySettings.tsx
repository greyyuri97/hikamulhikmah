"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Type } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "./Providers";

/** Phone-only: text-size controls in one 44px popover (theme has its own header toggle). */
export default function DisplaySettings() {
  const { scale, bumpScale } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    window.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); window.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div ref={ref} className="relative sm:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`grid h-11 w-11 place-items-center rounded-lg ${open ? "bg-accent/10 text-accent" : "text-muted"}`}
        aria-label="Saiz teks" aria-expanded={open}
      >
        <Type size={19} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="card absolute right-0 top-12 z-50 w-56 p-3 shadow-lg"
          >
            <p className="mb-1.5 text-xs font-medium text-muted">Saiz teks · {Math.round(scale * 100)}%</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => bumpScale(-0.05)} className="btn border border-line text-sm" aria-label="Kecilkan teks">A−</button>
              <button onClick={() => bumpScale(0.05)} className="btn border border-line text-lg" aria-label="Besarkan teks">A+</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
