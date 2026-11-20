"use client";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import NoteCard from "./NoteCard";
import { dateValue, normalize } from "@/lib/utils";
import type { Note } from "@/lib/types";

export default function KitabNotesView({
  notes, sectionKey, title, arabic, blurb, href, admin,
}: { notes: Note[]; sectionKey: string; title: string; arabic: string; blurb: string; href: string; admin: boolean }) {
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const list = useMemo(() => {
    const nq = normalize(q.trim());
    const f = from ? new Date(from).getTime() : -Infinity;
    const t = to ? new Date(to).getTime() + 86399999 : Infinity;
    return [...notes]
      .sort((a, b) => dateValue(b.date) - dateValue(a.date))
      .filter((n) => {
        const d = dateValue(n.date);
        if ((from || to) && (d < f || d > t)) return false;
        return !nq || normalize(n.content + " " + n.date).includes(nq);
      });
  }, [notes, q, from, to]);

  return (
    <div>
      <header className="mb-6">
        <p dir="rtl" className="font-arabic text-2xl text-accent">{arabic}</p>
        <h1 className="font-serif text-2xl font-semibold sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted">{blurb} · {notes.length} nota</p>
      </header>
      <div className="no-print sticky top-16 z-20 -mx-4 mb-5 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input className="input pl-9" placeholder="Cari kata kunci…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Dari tarikh" />
            <span className="text-muted">–</span>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Hingga tarikh" />
            {(q || from || to) && (
              <button className="btn-ghost" onClick={() => { setQ(""); setFrom(""); setTo(""); }} aria-label="Kosongkan"><X size={16} /></button>
            )}
          </div>
        </div>
      </div>
      <div className="space-y-4">
        {list.map((n) => (
          <NoteCard key={n.note_id} note={n} sectionKey={sectionKey} sectionTitle={title} href={href} admin={admin} highlight={q} />
        ))}
        {list.length === 0 && <p className="card p-10 text-center text-muted">Tiada nota ditemui.</p>}
      </div>
    </div>
  );
}
