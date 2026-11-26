"use client";
import { CheckCircle2, ExternalLink, ImageIcon, Link2, XCircle } from "lucide-react";
import { parseImageLink, parseSourceLink, sourceLabel } from "@/lib/mediaLinks";

/**
 * Optional image + original-post fields with live validation/preview (admin form & inline edit).
 * `showSource={false}` hides the original-post field (used by Fawaid Zahabiyyah).
 */
export default function NoteMediaFields({
  image, setImage, source, setSource, showSource = true,
}: { image: string; setImage: (v: string) => void; source: string; setSource: (v: string) => void; showSource?: boolean }) {
  const img = parseImageLink(image);
  const imgBad = image.trim() !== "" && !img;
  const src = parseSourceLink(source);
  const srcBad = source.trim() !== "" && !src;

  return (
    <div className="space-y-3">
      <label className="block min-w-0">
        <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted"><ImageIcon size={13} /> Pautan Gambar (Google Drive / URL — Pilihan)</span>
        <input className={`input ${imgBad ? "!border-red-500" : ""}`} inputMode="url" placeholder="https://drive.google.com/file/d/…/view?usp=sharing" value={image} onChange={(e) => setImage(e.target.value)} />
        {img && (
          <span className="mt-1.5 flex min-w-0 items-center gap-2 rounded-lg bg-accent/5 p-2 text-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" referrerPolicy="no-referrer" className="h-14 w-20 shrink-0 rounded-md border border-line bg-paper object-cover" />
            <span className="min-w-0">
              <span className="flex items-center gap-1 font-semibold text-accent"><CheckCircle2 size={13} /> {img.kind === "drive" ? "Google Drive → imej terus" : "URL imej"}</span>
              <span className="block truncate text-muted">{img.url}</span>
              {img.kind === "drive" && <span className="block text-muted">Fail mesti dikongsi “Sesiapa yang ada pautan”.</span>}
            </span>
          </span>
        )}
        {imgBad && <span className="mt-1 flex items-center gap-1 text-xs text-red-600"><XCircle size={13} /> Mesti pautan Google Drive atau URL https://</span>}
      </label>

      {showSource && (
      <label className="block min-w-0">
        <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted"><Link2 size={13} /> Pautan Posting Asal (Facebook / Telegram / URL — Pilihan)</span>
        <input className={`input ${srcBad ? "!border-red-500" : ""}`} inputMode="url" placeholder="https://www.facebook.com/…  atau  https://t.me/…" value={source} onChange={(e) => setSource(e.target.value)} />
        {src && (
          <a href={src} target="_blank" rel="noopener noreferrer" className="mt-1 flex min-w-0 items-center gap-1 text-xs text-accent hover:underline">
            <CheckCircle2 size={13} className="shrink-0" /> {sourceLabel(src)} <ExternalLink size={11} className="shrink-0" /> <span className="truncate text-muted">{src}</span>
          </a>
        )}
        {srcBad && <span className="mt-1 flex items-center gap-1 text-xs text-red-600"><XCircle size={13} /> Mesti bermula dengan http:// atau https://</span>}
      </label>
      )}
    </div>
  );
}

export const mediaInvalid = (image: string, source: string) =>
  (image.trim() !== "" && !parseImageLink(image)) || (source.trim() !== "" && !parseSourceLink(source));
