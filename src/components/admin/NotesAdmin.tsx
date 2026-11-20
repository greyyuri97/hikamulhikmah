"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Note } from "@/lib/types";
import { addNote, deleteRecord, updateNote } from "@/lib/actions";
import { dateValue, todayISO } from "@/lib/utils";

export default function NotesAdmin({ sectionKey, title, notes }: { sectionKey: "bukhari" | "muslim" | "fawaid"; title: string; notes: Note[] }) {
  const [date, setDate] = useState(todayISO());
  const [content, setContent] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();

  const submit = async () => {
    setBusy(true); setMsg("");
    const r = editId ? await updateNote(sectionKey, editId, date, content) : await addNote(sectionKey, date, content);
    setBusy(false);
    if (r.ok) { setMsg(editId ? "✓ Dikemas kini" : "✓ Diterbitkan"); setContent(""); setEditId(null); setDate(todayISO()); router.refresh(); }
    else setMsg(r.error);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="card h-fit space-y-3 p-4 lg:sticky lg:top-20">
        <h2 className="font-serif font-semibold">{editId ? "Edit nota" : "Tambah nota baharu"} — {title}</h2>
        <input className="input" value={date} onChange={(e) => setDate(e.target.value)} placeholder="Tarikh (YYYY-MM-DD)" />
        <textarea className="input min-h-[260px] leading-7" dir="auto" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Kandungan nota…" />
        <div className="flex items-center gap-2">
          <button className="btn-accent" disabled={busy || !content.trim()} onClick={submit}><Plus size={14} /> {busy ? "Menyimpan…" : editId ? "Kemas Kini" : "Terbitkan"}</button>
          {editId && <button className="btn-ghost" onClick={() => { setEditId(null); setContent(""); setDate(todayISO()); }}>Batal</button>}
          {msg && <span className="text-sm text-accent">{msg}</span>}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted">{notes.length} rekod</p>
        {[...notes].sort((a, b) => dateValue(b.date) - dateValue(a.date)).map((n) => (
          <div key={n.note_id} className="card flex items-start gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-accent">{n.date}</p>
              <p className="line-clamp-2 text-sm" dir="auto">{n.content}</p>
            </div>
            <button className="btn-ghost" aria-label="Edit" onClick={() => { setEditId(n.note_id); setDate(n.date); setContent(n.content); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Pencil size={14} /></button>
            <button className="btn-ghost hover:!text-red-600" aria-label="Padam" onClick={async () => {
              if (!confirm("Padam nota ini?")) return;
              const r = await deleteRecord(sectionKey, n.note_id);
              if (!r.ok) alert(r.error); else router.refresh();
            }}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
