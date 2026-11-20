"use client";
import { Bookmark as BIcon, BookmarkCheck } from "lucide-react";
import { useApp, type Bookmark } from "./Providers";

export default function BookmarkButton({ item, compact }: { item: Omit<Bookmark, "savedAt">; compact?: boolean }) {
  const { isBookmarked, toggleBookmark } = useApp();
  const on = isBookmarked(item.id);
  return (
    <button
      type="button"
      onClick={() => toggleBookmark(item)}
      className={`btn-ghost no-print ${on ? "!text-accent" : ""}`}
      aria-pressed={on}
      aria-label={on ? "Buang simpanan" : "Simpan"}
    >
      {on ? <BookmarkCheck size={16} /> : <BIcon size={16} />}
      {!compact && <span className="text-xs">{on ? "Disimpan" : "Simpan"}</span>}
    </button>
  );
}
