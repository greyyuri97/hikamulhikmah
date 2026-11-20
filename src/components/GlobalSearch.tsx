"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { normalize } from "@/lib/utils";

export interface SearchItem {
  section: string;
  title: string;
  text: string;
  href: string;
  badge?: string;
}

function snippet(text: string, q: string) {
  const i = normalize(text).indexOf(q);
  if (i < 0) return text.slice(0, 140);
  const s = Math.max(0, i - 60);
  return (s > 0 ? "…" : "") + text.slice(s, i + q.length + 90) + "…";
}

export default function GlobalSearch({ items }: { items: SearchItem[] }) {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const nq = normalize(q.trim());
    if (nq.length < 2) return null;
    const out = new Map<string, SearchItem[]>();
    for (const it of items) {
      if (normalize(it.title + " " + it.text).includes(nq)) {
        const arr = out.get(it.section) ?? [];
        if (arr.length < 6) arr.push({ ...it, text: snippet(it.text, nq) });
        out.set(it.section, arr);
      }
    }
    return [...out.entries()];
  }, [q, items]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={20} />
        <input
          className="input h-14 rounded-2xl pl-12 pr-10 text-base shadow-sm"
          placeholder="Cari dalam semua nota, video, transkrip & podcast…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && (
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" onClick={() => setQ("")} aria-label="Kosongkan"><X size={18} /></button>
        )}
      </div>
      {groups && (
        <div className="card mt-3 max-h-[60vh] space-y-5 overflow-y-auto p-4">
          {groups.length === 0 && <p className="text-center text-sm text-muted">Tiada hasil untuk “{q}”.</p>}
          {groups.map(([section, list]) => (
            <section key={section}>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-accent">{section}</h3>
              <ul className="space-y-1">
                {list.map((it, i) => (
                  <li key={i}>
                    <Link href={it.href} className="block rounded-lg p-2 hover:bg-paper">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {it.badge && <span className="badge-time">{it.badge}</span>}
                        <span className="line-clamp-1">{it.title}</span>
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted" dir="auto">{it.text}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
