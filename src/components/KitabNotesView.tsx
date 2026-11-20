"use client";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import NoteCard from "./NoteCard";
import { BULAN, dateValue, formatDateMs, normalize } from "@/lib/utils";
import type { Note } from "@/lib/types";

const monthKey = (d: Date) => `${BULAN[d.getMonth()]} ${d.getFullYear()}`;

export default function KitabNotesView({
  notes, sectionKey, title, arabic, blurb, href, admin,
}: { notes: Note[]; sectionKey: string; title: string; arabic: string; blurb: string; href: string; admin: boolean }) {
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [month, setMonth] = useState("Semua");

  const months = useMemo(() => {
    const seen = new Map<string, number>();
    for (const n of notes) {
      const v = dateValue(n.date);
      if (!v) continue;
      const d = new Date(v);
      const k = monthKey(d);
      if (!seen.has(k)) seen.set(k, new Date(d.getFullYear(), d.getMonth(), 1).getTime());
    }
    return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }, [notes]);

  const list = useMemo(() => {
    const nq = normalize(q.trim());
    const f = from ? dateValue(from) : -Infinity;
    const t = to ? dateValue(to) : Infinity;
    return [...notes]
      .sort((a, b) => dateValue(b.date) - dateValue(a.date))
      .filter((n) => {
        const d = dateValue(n.date);
        if ((from || to) && (d < f || d > t)) return false;
        if (month !== "Semua" && (!d || monthKey(new Date(d)) !== month)) return false;
        return !nq || normalize(`${n.content} ${n.date} ${formatDateMs(n.date)}`).includes(nq);
      });
  }, [notes, q, from, to, month]);

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
            <input type="date" className="input date-input" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Dari tarikh" />
            <span className="text-muted">–</span>
            <input type="date" className="input date-input" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Hingga tarikh" />
            {(q || from || to || month !== "Semua") && (
              <button className="btn-ghost" onClick={() => { setQ(""); setFrom(""); setTo(""); setMonth("Semua"); }} aria-label="Kosongkan"><X size={16} /></button>
            )}
          </div>
        </div>
        {months.length > 1 && (
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {["Semua", ...months].map((m) => (
              <button key={m} onClick={() => setMonth(m)} className={`tap shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors ${month === m ? "border-accent bg-accent text-white" : "border-line bg-surface text-muted hover:text-ink"}`}>{m}</button>
            ))}
          </div>
        )}
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
