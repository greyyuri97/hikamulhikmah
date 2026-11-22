"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, ChevronDown, ExternalLink, Pencil, Save, X } from "lucide-react";
import CopyButton from "./CopyButton";
import BookmarkButton from "./BookmarkButton";
import { updateNote } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { saveLastViewed } from "@/lib/progress";
import type { Note } from "@/lib/types";
import { formatDateMs, toISODate, todayISO } from "@/lib/utils";
import DateField from "./DateField";
import NoteImage from "./NoteImage";
import NoteMediaFields, { mediaInvalid } from "./NoteMediaFields";
import { sourceLabel } from "@/lib/mediaLinks";

const COLLAPSED = 7.2; // ~4 lines at leading-7 (rem)

export default function NoteCard({
  note, sectionKey, sectionTitle, href, admin, highlight,
}: { note: Note; sectionKey: string; sectionTitle: string; href: string; admin: boolean; highlight?: string }) {
  const [open, setOpen] = useState(false);
  const [overflow, setOverflow] = useState(false);
  const [editing, setEditing] = useState(false);
  const isoDate = toISODate(note.date);
  const nice = formatDateMs(note.date) || "—";
  const [date, setDate] = useState(isoDate || todayISO());
  const [content, setContent] = useState(note.content);
  const [image, setImage] = useState(note.image_url ?? "");
  const [source, setSource] = useState(note.source_url ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useLayoutEffect(() => {
    const el = ref.current;
    if (el) setOverflow(el.scrollHeight > el.clientHeight + 4);
  }, [note.content]);
  useEffect(() => { setDate(toISODate(note.date) || todayISO()); setContent(note.content); setImage(note.image_url ?? ""); setSource(note.source_url ?? ""); }, [note]);

  const waText = `*${sectionTitle} — Tarikh: ${nice}*\n\n${note.content}`;

  const save = async () => {
    setBusy(true); setErr("");
    const r = await updateNote(sectionKey, note.note_id, date, content, { image_url: image, source_url: source });
    setBusy(false);
    if (r.ok) { setEditing(false); router.refresh(); } else setErr(r.error);
  };

  return (
    <motion.article layout="position" id={note.note_id} className="card scroll-mt-24 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          <CalendarDays size={13} /> <time dateTime={isoDate || undefined}>{nice}</time>
        </span>
        <div className="flex items-center">
          {admin && !editing && (
            <button className="btn-ghost no-print" onClick={() => setEditing(true)}><Pencil size={14} /><span className="text-xs">Edit</span></button>
          )}
          {note.source_url && (
            <a
              href={note.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost no-print"
              aria-label={`Posting Asal (${sourceLabel(note.source_url)})`}
              title={`Buka posting asal — ${sourceLabel(note.source_url)}`}
            >
              <ExternalLink size={16} />
              <span className="hidden text-xs sm:inline">Posting Asal</span>
            </a>
          )}
          <BookmarkButton compact item={{ id: `${sectionKey}:${note.note_id}`, kind: "note", section: sectionTitle, title: `Tarikh: ${nice}`, snippet: note.content.slice(0, 160), href: `${href}#${note.note_id}` }} />
          <CopyButton text={waText} />
        </div>
      </div>

      {editing ? (
        <div className="space-y-2">
          <DateField value={date} onChange={setDate} />
          <textarea className="input min-h-[220px] leading-7" value={content} onChange={(e) => setContent(e.target.value)} />
          <NoteMediaFields image={image} setImage={setImage} source={source} setSource={setSource} />
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex gap-2">
            <button className="btn-accent" disabled={busy || mediaInvalid(image, source)} onClick={save}><Save size={14} /> {busy ? "Menyimpan…" : "Simpan"}</button>
            <button className="btn-ghost" onClick={() => { setEditing(false); setContent(note.content); setDate(isoDate || todayISO()); setImage(note.image_url ?? ""); setSource(note.source_url ?? ""); }}><X size={14} /> Batal</button>
          </div>
        </div>
      ) : (
        <>
          {note.image_url && <NoteImage src={note.image_url} alt={`Gambar — ${sectionTitle}, ${nice}`} />}
          <motion.div
            ref={ref}
            initial={false}
            animate={{ maxHeight: open ? 4000 : `${COLLAPSED}rem` }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="relative overflow-hidden whitespace-pre-wrap leading-7 text-ink"
            dir="auto"
          >
            <Highlighted text={note.content} q={highlight} />
            {!open && overflow && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface" />}
          </motion.div>
          {overflow && (
            <button onClick={() => { if (!open) saveLastViewed({ kind: "note", section: sectionTitle, title: `Tarikh: ${nice}`, snippet: note.content.slice(0, 120), href: `${href}#${note.note_id}` }); setOpen((o) => !o); }} className="no-print tap mt-1 inline-flex min-h-[40px] items-center gap-1 text-sm font-semibold text-accent hover:text-accent-hover">
              {open ? "Tutup" : "Baca Penuh"}
              <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
          )}
        </>
      )}
    </motion.article>
  );
}

export function Highlighted({ text, q }: { text: string; q?: string }) {
  if (!q || q.trim().length < 2) return <>{text}</>;
  const esc = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${esc})`, "gi"));
  return <>{parts.map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p))}</>;
}
