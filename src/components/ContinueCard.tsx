"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { History, PlayCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { dismissLastViewed, readLastViewed, type LastViewed } from "@/lib/progress";

export default function ContinueCard() {
  const [v, setV] = useState<LastViewed | null>(null);
  useEffect(() => setV(readLastViewed()), []);
  return (
    <AnimatePresence>
      {v && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="card relative flex items-center gap-3 overflow-hidden border-accent/30 p-3 pr-10">
          <span className="absolute inset-y-0 left-0 w-1 bg-accent" />
          <span className="ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
            {v.kind === "video" ? <PlayCircle size={20} /> : <History size={20} />}
          </span>
          <Link href={v.href} className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Sambung Pengajian · {v.section}</p>
            <p className="line-clamp-1 font-medium">{v.title}{v.time_display && <span className="badge-time ml-2">[{v.time_display}]</span>}</p>
            {v.snippet && <p className="line-clamp-1 text-xs text-muted" dir="auto">{v.snippet}</p>}
          </Link>
          <button className="absolute right-2 top-2 text-muted hover:text-ink" aria-label="Tutup" onClick={() => { dismissLastViewed(v.at); setV(null); }}>
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
