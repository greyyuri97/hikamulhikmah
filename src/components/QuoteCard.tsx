"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Download, ImageIcon, Share2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { isArabic } from "@/lib/utils";

export interface QuoteData {
  arabic?: string;
  text?: string;
  source: string; // e.g. "Dars Soheh al-Bukhari — 12 Nov 2026"
}

const W = 1080;
const PAPER = "#F5F4F0", INK = "#1A1E24", ACCENT = "#A84A0A", MUTED = "#525866";

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const out: string[] = [];
  for (const para of text.split(/\n+/)) {
    let line = "";
    for (const w of para.split(/\s+/)) {
      const t = line ? line + " " + w : w;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
    }
    if (line) out.push(line);
  }
  return out;
}

function loadImg(src: string) {
  return new Promise<HTMLImageElement | null>((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}

async function render(q: QuoteData): Promise<HTMLCanvasElement> {
  await document.fonts?.ready;
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d")!;
  const pad = 110, maxW = W - pad * 2;
  // Measure text blocks, shrinking the font for long quotes.
  const blocks: { lines: string[]; font: string; lh: number; rtl: boolean; color: string }[] = [];
  const total = (q.arabic?.length ?? 0) + (q.text?.length ?? 0);
  const k = total > 900 ? 0.62 : total > 500 ? 0.75 : total > 250 ? 0.88 : 1;
  if (q.arabic) { const f = `${Math.round(54 * k)}px Amiri, serif`; ctx.font = f; blocks.push({ lines: wrap(ctx, q.arabic, maxW), font: f, lh: 98 * k, rtl: true, color: INK }); }
  // Each paragraph picks its own direction/font, so Arabic lines inside a Malay note stay right-aligned.
  for (const para of (q.text ?? "").split(/\n\s*\n|\n/).map((x) => x.trim()).filter(Boolean)) {
    const rtl = isArabic(para);
    const f = rtl ? `${Math.round(50 * k)}px Amiri, serif` : `${Math.round(36 * k)}px Lora, Georgia, serif`;
    ctx.font = f;
    blocks.push({ lines: wrap(ctx, para, maxW), font: f, lh: (rtl ? 88 : 56) * k, rtl, color: q.arabic ? MUTED : rtl ? ACCENT : INK });
  }
  const GAP = 26;
  const textH = blocks.reduce((s, b) => s + b.lines.length * b.lh, 0) + (blocks.length - 1) * GAP;
  const H = Math.max(1080, Math.min(2400, Math.ceil(textH + 560)));
  c.width = W; c.height = H;

  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = ACCENT; ctx.lineWidth = 6; ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.lineWidth = 2; ctx.strokeRect(54, 54, W - 108, H - 108);
  // corner diamonds
  ctx.fillStyle = ACCENT;
  for (const [x, y] of [[54, 54], [W - 54, 54], [54, H - 54], [W - 54, H - 54]]) { ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x + 14, y); ctx.lineTo(x, y + 14); ctx.lineTo(x - 14, y); ctx.fill(); }
  // opening quote mark
  ctx.font = "160px Lora, Georgia, serif"; ctx.globalAlpha = 0.15; ctx.fillText("“", pad - 20, 230); ctx.globalAlpha = 1;

  let y = (H - 300 - textH) / 2 + 140;
  for (const b of blocks) {
    ctx.font = b.font; ctx.fillStyle = b.color;
    ctx.direction = b.rtl ? "rtl" : "ltr"; ctx.textAlign = b.rtl ? "right" : "left";
    for (const l of b.lines) { y += b.lh * 0.8; ctx.fillText(l, b.rtl ? W - pad : pad, y); y += b.lh * 0.2; }
    y += GAP;
  }
  ctx.direction = "ltr"; ctx.textAlign = "center";
  // source line
  ctx.fillStyle = ACCENT; ctx.font = "600 26px Inter, sans-serif";
  ctx.fillText(q.source.toUpperCase(), W / 2, H - 230, maxW);
  // divider
  ctx.strokeStyle = ACCENT; ctx.globalAlpha = 0.5; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2 - 140, H - 200); ctx.lineTo(W / 2 + 140, H - 200); ctx.stroke(); ctx.globalAlpha = 1;
  // watermark
  const logo = await loadImg("/logo.png");
  if (logo) {
    const lh = 120, lw = (logo.width / logo.height) * lh;
    ctx.drawImage(logo, (W - lw) / 2, H - 185, lw, lh);
  } else {
    ctx.fillStyle = INK; ctx.font = "56px 'Aref Ruqaa', Amiri, serif"; ctx.direction = "rtl"; ctx.fillText("حِكَمُ الحِكْمَةِ", W / 2, H - 120);
    ctx.direction = "ltr"; ctx.fillStyle = ACCENT; ctx.font = "22px Lora, serif"; ctx.fillText("Intisari Kebijaksanaan", W / 2, H - 85);
  }
  return c;
}

export function QuoteCardButton({ data }: { data: QuoteData | (() => QuoteData) }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn-ghost no-print" onClick={() => setOpen(true)} aria-label="Kongsi Kad" title="Kongsi Kad">
        <ImageIcon size={16} />
      </button>
      <QuoteModal open={open} onClose={() => setOpen(false)} data={open ? (typeof data === "function" ? data() : data) : null} />
    </>
  );
}

function QuoteModal({ open, onClose, data }: { open: boolean; onClose: () => void; data: QuoteData | null }) {
  const [url, setUrl] = useState("");
  const blobRef = useRef<Blob | null>(null);
  useEffect(() => {
    if (!open || !data) return;
    let u = "";
    render(data).then((c) => c.toBlob((b) => { if (!b) return; blobRef.current = b; u = URL.createObjectURL(b); setUrl(u); }, "image/png"));
    return () => { if (u) URL.revokeObjectURL(u); setUrl(""); };
  }, [open, data]);

  const fname = "hikam-al-hikmah-kad.png";
  const download = () => { const a = document.createElement("a"); a.href = url; a.download = fname; a.click(); };
  const share = async () => {
    const b = blobRef.current; if (!b) return;
    const file = new File([b], fname, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: "حِكَمُ الحِكْمَةِ" }); } catch {} }
    else download();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="card flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden" initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line p-3">
              <h3 className="font-serif font-semibold">Kongsi Kad</h3>
              <button className="btn-ghost" onClick={onClose} aria-label="Tutup"><X size={16} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-paper p-4">
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="Pratonton kad" className="mx-auto w-full rounded-lg shadow-md" />
              ) : (
                <div className="grid aspect-square place-items-center text-sm text-muted">Menjana kad…</div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-line p-3">
              <button className="btn-ghost border border-line" disabled={!url} onClick={download}><Download size={16} /> Muat Turun</button>
              <button className="btn-accent" disabled={!url} onClick={share}><Share2 size={16} /> Kongsi</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
