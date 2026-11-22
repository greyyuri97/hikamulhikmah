"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { runExclusive, useAdminBusy } from "@/lib/adminClient";
import { CheckSquare, Pencil, Plus, Square, Trash2, X } from "lucide-react";
import type { Note } from "@/lib/types";
import { addNote, deleteRecord, deleteRecords, updateNote } from "@/lib/actions";
import { dateValue, formatDateMs, toISODate, todayISO } from "@/lib/utils";
import DateField from "@/components/DateField";
import NoteMediaFields, { mediaInvalid } from "@/components/NoteMediaFields";

type AdminNote = Note & { _row?: number };

export default function NotesAdmin({ sectionKey, title, notes }: { sectionKey: "bukhari" | "muslim" | "fawaid"; title: string; notes: AdminNote[] }) {
  const [date, setDate] = useState(todayISO());
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");
  const [source, setSource] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const adminBusy = useAdminBusy();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set()); // optimistic: removed before the refresh lands
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const visible = [...notes].filter((n) => !hidden.has(n.note_id)).sort((a, b) => dateValue(b.date) - dateValue(a.date));
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  /** One server call for 1..N notes: ~2 Google reads + 1 write in total. */
  const removeNotes = async (ids: string[]) => {
    const items = ids.map((id) => ({ id, row: notes.find((n) => n.note_id === id)?._row }));
    setHidden((h) => new Set([...h, ...ids]));
    setNotice(null);
    const r = await runExclusive(() => (items.length === 1 ? deleteRecord(sectionKey, items[0].id, items[0].row) : deleteRecords(sectionKey, items)));
    if (r.ok) {
      setSelected(new Set());
      setNotice({ kind: "ok", text: `✓ ${items.length === 1 ? "1 nota" : `${r.id ?? items.length} nota`} dipadam` });
      router.refresh();
    } else {
      setHidden((h) => { const n = new Set(h); ids.forEach((id) => n.delete(id)); return n; }); // put them back
      setNotice({ kind: "err", text: r.error });
    }
  };

  const submit = async () => {
    setBusy(true); setMsg("");
    const r = await runExclusive(() => (editId ? updateNote(sectionKey, editId, date, content, { image_url: image, source_url: source }) : addNote(sectionKey, date, content, { image_url: image, source_url: source })));
    setBusy(false);
    if (r.ok) { setMsg(editId ? "✓ Dikemas kini" : "✓ Diterbitkan"); setContent(""); setImage(""); setSource(""); setEditId(null); setDate(todayISO()); router.refresh(); }
    else setMsg(r.error);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="card h-fit min-w-0 space-y-3 p-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
        <h2 className="font-serif font-semibold">{editId ? "Edit nota" : "Tambah nota baharu"} — {title}</h2>
        <DateField value={date} onChange={setDate} />
        <textarea className="input min-h-[260px] leading-7" dir="auto" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Kandungan nota…" />
        <NoteMediaFields image={image} setImage={setImage} source={source} setSource={setSource} />
        <div className="flex items-center gap-2">
          <button className="btn-accent" disabled={busy || !content.trim() || mediaInvalid(image, source)} onClick={submit}><Plus size={14} /> {busy ? "Menyimpan…" : editId ? "Kemas Kini" : "Terbitkan"}</button>
          {editId && <button className="btn-ghost" onClick={() => { setEditId(null); setContent(""); setImage(""); setSource(""); setDate(todayISO()); }}>Batal</button>}
          {msg && <span className="text-sm text-accent">{msg}</span>}
        </div>
      </div>
      <div className="min-w-0 space-y-2">
        {/* Selection toolbar — sticky so "Padam (N)" stays reachable while scrolling a long list */}
        <div className="sticky top-16 z-10 -mx-1 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-paper/95 p-2 backdrop-blur">
          <button className="btn-ghost text-xs" onClick={() => setSelected(selected.size === visible.length ? new Set() : new Set(visible.map((n) => n.note_id)))}>
            {selected.size && selected.size === visible.length ? <CheckSquare size={15} /> : <Square size={15} />} Pilih semua
          </button>
          <span className="text-sm text-muted">{visible.length} rekod{selected.size ? ` · ${selected.size} dipilih` : ""}</span>
          {selected.size > 0 && (
            <>
              <button className="btn-ghost text-xs" onClick={() => setSelected(new Set())}><X size={14} /> Batal</button>
              <button
                className="btn ml-auto bg-red-600 text-white hover:bg-red-700"
                disabled={adminBusy}
                onClick={() => { if (confirm(`Padam ${selected.size} nota yang dipilih? Tindakan ini tidak boleh dibatalkan.`)) removeNotes([...selected]); }}
              >
                <Trash2 size={14} /> Padam ({selected.size})
              </button>
            </>
          )}
        </div>
        {notice && (
          <p className={`rounded-lg p-2.5 text-sm ${notice.kind === "ok" ? "bg-accent/10 text-accent" : "border border-red-500/40 bg-red-500/10 text-red-600"}`}>{notice.text}</p>
        )}
        {visible.map((n) => {
          const on = selected.has(n.note_id);
          return (
            <div key={n.note_id} className={`card flex items-start gap-2 p-3 ${on ? "border-red-500/50 ring-1 ring-red-500/20" : ""}`}>
              <label className="tap flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center" aria-label="Pilih nota">
                <input type="checkbox" className="h-4 w-4 accent-[var(--accent-primary)]" checked={on} onChange={() => toggle(n.note_id)} />
              </label>
              <div className="min-w-0 flex-1 cursor-pointer" onClick={() => toggle(n.note_id)}>
                <p className="flex items-center gap-2 text-xs font-semibold text-accent">
                  {formatDateMs(n.date)}
                  {n.image_url && <span className="rounded bg-accent/10 px-1.5 py-px text-[10px]">🖼 Gambar</span>}
                  {n.source_url && <span className="rounded bg-accent/10 px-1.5 py-px text-[10px]">🔗 Asal</span>}
                </p>
                <p className="line-clamp-2 text-sm" dir="auto">{n.content}</p>
              </div>
              <button className="btn-ghost" aria-label="Edit" onClick={() => { setEditId(n.note_id); setDate(toISODate(n.date) || todayISO()); setContent(n.content); setImage(n.image_url ?? ""); setSource(n.source_url ?? ""); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Pencil size={14} /></button>
              <button className="btn-ghost hover:!text-red-600" aria-label="Padam" disabled={adminBusy} onClick={() => { if (confirm("Padam nota ini?")) removeNotes([n.note_id]); }}><Trash2 size={14} /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
