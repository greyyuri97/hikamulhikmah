"use client";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Trash2, X } from "lucide-react";
import { useApp } from "./Providers";

export default function BookmarksDrawer() {
  const { drawerOpen, setDrawerOpen, bookmarks, toggleBookmark } = useApp();
  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div className="fixed inset-0 z-50 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawerOpen(false)} />
          <motion.aside
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line bg-paper"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            <div className="flex items-center justify-between border-b border-line p-4">
              <h2 className="font-serif text-lg font-semibold">Simpanan Saya</h2>
              <button onClick={() => setDrawerOpen(false)} className="btn-ghost" aria-label="Tutup"><X size={18} /></button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {bookmarks.length === 0 && (
                <p className="py-12 text-center text-sm text-muted">Tiada simpanan lagi. Tekan ikon penanda pada mana-mana nota, transkrip atau video.</p>
              )}
              {bookmarks.map((b) => (
                <div key={b.id} className="card p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-accent">{b.section}</span>
                    <button onClick={() => toggleBookmark(b)} className="text-muted hover:text-accent" aria-label="Buang"><Trash2 size={14} /></button>
                  </div>
                  <Link href={b.href} onClick={() => setDrawerOpen(false)} className="block">
                    <p className="font-medium">{b.title}</p>
                    <p className="mt-1 line-clamp-3 text-sm text-muted">{b.snippet}</p>
                  </Link>
                </div>
              ))}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
