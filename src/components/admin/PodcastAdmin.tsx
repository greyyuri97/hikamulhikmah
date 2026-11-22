"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { runExclusive, useAdminBusy } from "@/lib/adminClient";
import { CheckCircle2, FileText, Pencil, Plus, Save, Trash2, XCircle } from "lucide-react";
import type { Podcast } from "@/lib/types";
import { addPodcast, deleteRecord, updatePodcast } from "@/lib/actions";
import { extractYoutubeId, formatDateMs, toISODate, todayISO, ytThumb } from "@/lib/utils";
import { parsePdfLink } from "@/lib/pdfLink";
import DateField from "@/components/DateField";

export default function PodcastAdmin({ podcasts }: { podcasts: Podcast[] }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [pdf, setPdf] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const adminBusy = useAdminBusy();
  const id = extractYoutubeId(url);
  const pdfLink = parsePdfLink(pdf);
  const pdfInvalid = pdf.trim() !== "" && !pdfLink;

  useEffect(() => {
    if (!id || editId) return; // don't overwrite a title while editing
    setLoading(true);
    fetch(`/api/oembed?url=${encodeURIComponent(url)}`).then((r) => r.json()).then((d) => { if (d.title) setTitle(d.title); }).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const reset = () => { setUrl(""); setTitle(""); setPdf(""); setDate(todayISO()); setEditId(null); };

  const save = async () => {
    setBusy(true); setMsg("");
    const r = await runExclusive(() => (editId ? updatePodcast(editId, url, title, date, pdf) : addPodcast(url, title, date, pdf)));
    setBusy(false);
    if (r.ok) { setMsg(editId ? "✓ Dikemas kini" : "✓ Disimpan"); reset(); router.refresh(); } else setMsg(r.error);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* min-w-0 on both columns: without it a long URL in the PDF helper widens the grid
          track past the viewport (CSS grid items default to min-width:auto). */}
      <div className="card h-fit min-w-0 space-y-3 p-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
        <h2 className="font-serif font-semibold">{editId ? "Edit Podcast" : "Tambah Podcast"}</h2>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">URL YouTube</span>
          <input className="input" placeholder="https://www.youtube.com/watch?v=…" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="URL YouTube" inputMode="url" />
        </label>

        <div className="flex items-start gap-3">
          {id && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ytThumb(id)} alt="" className="aspect-video w-28 shrink-0 rounded-lg border border-line bg-line object-cover sm:w-36" />
          )}
          <label className="block min-w-0 flex-1">
            <span className="mb-1 block text-xs font-medium text-muted">Tajuk</span>
            <textarea className="input min-h-[2.75rem] resize-y leading-snug" rows={2} placeholder={loading ? "Mengambil tajuk…" : "Tajuk episod"} value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Tajuk" />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted">
            <FileText size={13} /> Pautan PDF Transkrip (Google Drive / URL) — pilihan
          </span>
          <input
            className={`input ${pdfInvalid ? "!border-red-500" : ""}`}
            placeholder="https://drive.google.com/file/d/…/view?usp=sharing"
            value={pdf}
            onChange={(e) => setPdf(e.target.value)}
            inputMode="url"
          />
          {pdfLink && (
            <span className="mt-1.5 block min-w-0 space-y-0.5 overflow-hidden rounded-lg bg-accent/5 p-2 text-xs">
              <span className="flex items-center gap-1 font-semibold text-accent">
                <CheckCircle2 size={13} />
                {pdfLink.kind === "drive" ? `Google Drive dikesan (ID: ${pdfLink.id.slice(0, 10)}…)` : pdfLink.kind === "docs" ? "Google Docs dikesan — dimuat turun sebagai PDF" : pdfLink.isPdf ? "Pautan PDF terus" : "Pautan URL (bukan .pdf — pastikan ia fail PDF)"}
              </span>
              <a className="block min-w-0 truncate text-muted underline" href={pdfLink.preview} target="_blank" rel="noopener noreferrer">Pratonton: {pdfLink.preview}</a>
              <a className="block min-w-0 truncate text-muted underline" href={pdfLink.download} target="_blank" rel="noopener noreferrer">Muat turun: {pdfLink.download}</a>
              {pdfLink.kind !== "direct" && <span className="block text-muted">Pastikan fail dikongsi sebagai “Sesiapa yang ada pautan”.</span>}
            </span>
          )}
          {pdfInvalid && <span className="mt-1 flex items-center gap-1 text-xs text-red-600"><XCircle size={13} /> Pautan tidak dikenali</span>}
        </label>

        <DateField value={date} onChange={setDate} label="Tarikh ditambah" />



        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-accent" disabled={!id || busy || pdfInvalid} onClick={save}>
            {editId ? <Save size={14} /> : <Plus size={14} />} {busy ? "Menyimpan…" : editId ? "Kemas Kini" : "Simpan"}
          </button>
          {editId && <button className="btn-ghost" onClick={reset}>Batal</button>}
          {msg && <span className="text-sm text-accent">{msg}</span>}
        </div>
      </div>

      <div className="min-w-0 space-y-2">
        <p className="text-sm text-muted">{podcasts.length} episod · {podcasts.filter((p) => p.pdf_url).length} dengan PDF</p>
        {podcasts.map((p) => (
          <div key={p.podcast_id} className={`card flex items-center gap-3 p-2 ${editId === p.podcast_id ? "border-accent ring-1 ring-accent/30" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ytThumb(p.youtube_id)} alt="" className="h-14 w-24 shrink-0 rounded-md object-cover" />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm">{p.title}</p>
              <p className="flex items-center gap-2 text-xs text-muted">
                {formatDateMs(p.date_added)}
                {p.pdf_url && <span className="inline-flex items-center gap-0.5 font-semibold text-accent"><FileText size={11} /> PDF</span>}
              </p>
            </div>
            <button className="btn-ghost" aria-label="Edit" onClick={() => {
              setEditId(p.podcast_id); setUrl(p.youtube_url || `https://youtu.be/${p.youtube_id}`); setTitle(p.title);
              setDate(toISODate(p.date_added) || todayISO()); setPdf(p.pdf_url); setMsg("");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}><Pencil size={14} /></button>
            <button className="btn-ghost hover:!text-red-600" aria-label="Padam" disabled={adminBusy} onClick={async () => {
              if (!confirm("Padam podcast ini?")) return;
              const r = await runExclusive(() => deleteRecord("podcast", p.podcast_id, (p as { _row?: number })._row));
              if (!r.ok) alert(r.error); else router.refresh();
            }}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
